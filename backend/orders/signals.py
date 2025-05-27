# orders/signals.py
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.db import transaction
from django.conf import settings
from .models import Order, OrderItem  # Ensure OrderItem is imported
from products.models import Product  # Import Product model
from django.db.models import F  # Import F object

from .serializers import OrderSerializer
from .kitchen.serializers import KitchenOrderSerializer

# Import the updated controller
from hardware.controllers.receipt_printer import ReceiptPrinterController

logger = logging.getLogger(__name__)


def deduct_inventory_for_order(order_id: int):
    """
    Deducts inventory for grocery items in a given order.
    This function is intended to be called via transaction.on_commit.
    It fetches a fresh order instance to ensure data consistency.
    """
    try:
        # Fetch a fresh instance of the order within the on_commit lambda
        order_instance = (
            Order.objects.select_related(None)
            .prefetch_related("items__product")
            .get(pk=order_id)
        )

        # Final check of the flag, though it should ideally be handled before scheduling.
        # This acts as a safeguard if the calling logic didn't update the in-memory instance's flag.
        if order_instance.inventory_processed_for_completion:
            logger.info(
                f"Order {order_instance.id}: Inventory deduction already marked as processed. Skipping inside on_commit task."
            )
            return

        logger.info(
            f"Order {order_instance.id}: Executing inventory deduction (on_commit)."
        )

        items_to_update = []
        with transaction.atomic():  # Nested transaction for inventory updates
            for item in order_instance.items.all():  # Iterate over prefetched items
                product = item.product
                if product.is_grocery_item:
                    quantity_sold = item.quantity
                    logger.info(
                        f"Order {order_instance.id}: Product '{product.name}' (ID: {product.id}) is grocery. "
                        f"Attempting to deduct {quantity_sold} from inventory."
                    )
                    # Use Product.objects.filter().update() for atomic operation
                    updated_rows = Product.objects.filter(pk=product.pk).update(
                        inventory_quantity=F("inventory_quantity") - quantity_sold
                    )
                    if updated_rows > 0:
                        logger.info(
                            f"Order {order_instance.id}: Successfully deducted {quantity_sold} "
                            f"from inventory for product '{product.name}'."
                        )
                    else:
                        logger.warning(
                            f"Order {order_instance.id}: Could not deduct inventory for product "
                            f"'{product.name}' (ID: {product.id}). Product not found or update failed (e.g. race condition)."
                        )

            # After all items are processed, mark the order's inventory as processed.
            # This is crucial to prevent reprocessing.
            order_instance.inventory_processed_for_completion = True
            order_instance.save(update_fields=["inventory_processed_for_completion"])
            logger.info(
                f"Order {order_instance.id}: Flag 'inventory_processed_for_completion' successfully set to True in DB."
            )

    except Order.DoesNotExist:
        logger.error(
            f"Order with ID {order_id} not found when attempting to deduct inventory."
        )
    except Exception as e:
        logger.error(
            f"Order {order_id}: Unexpected error during inventory deduction: {e}",
            exc_info=True,
        )


@receiver(post_save, sender=Order)
def order_status_change_handler(
    sender, instance: Order, created: bool, update_fields=None, **kwargs
):
    """
    Consolidated signal handler for Order post_save events.
    Handles:
    1. WebSocket updates for customer-facing website and KDS.
    2. Kitchen/QC ticket printing via direct backend or POS agent.
    3. Inventory deduction for completed/paid orders.
    """
    channel_layer = get_channel_layer()

    # --- 1. WebSocket Updates (KDS & Customer Facing) ---
    if instance.source == "website":
        logger.debug(
            f"Order {instance.id} (Website): Status changed to {instance.status}, Payment: {instance.payment_status}. Sending customer update."
        )
        async_to_sync(channel_layer.group_send)(
            f"website_order_{instance.id}",
            {
                "type": "status_update",
                "status": instance.status,
                "payment_status": instance.payment_status,
            },
        )

    # KDS Update Logic
    kds_relevant_pos_statuses = ["saved", "in-progress", "completed", "voided"]
    kds_relevant_website_statuses = [
        "pending",
        "preparing",
        "completed",
        "cancelled",
    ]  # For KDS, 'pending' usually means paid & ready

    should_update_kds = False
    if instance.source == "pos" and instance.status in kds_relevant_pos_statuses:
        should_update_kds = True
    # For website orders, only update KDS if paid and in a relevant status
    elif (
        instance.source == "website"
        and instance.payment_status == "paid"
        and instance.status in kds_relevant_website_statuses
    ):
        should_update_kds = True

    if should_update_kds:
        kds_order_data = KitchenOrderSerializer(instance).data
        kds_message_type = "order_update"
        # Determine if it's a "new" order for KDS (not yet completed/voided/cancelled, and if website, must be paid)
        is_new_for_kds = instance.status not in ["completed", "voided", "cancelled"]
        if instance.source == "website" and instance.payment_status != "paid":
            is_new_for_kds = False  # Don't treat unpaid website orders as new for KDS

        if created and is_new_for_kds:
            kds_message_type = "new_order"

        logger.debug(
            f"Order {instance.id}: Sending KDS {kds_message_type} to kitchen_orders group."
        )
        async_to_sync(channel_layer.group_send)(
            "kitchen_orders", {"type": kds_message_type, "order": kds_order_data}
        )

    # --- 2. Kitchen Ticket Printing (Direct Backend Printing) ---
    # This section handles printing based on 'kitchen_ticket_printed' flag
    can_print_kitchen_ticket = False
    if not created:  # Only on updates
        if instance.source == "pos" and instance.payment_status == "paid":
            can_print_kitchen_ticket = True
        elif (
            instance.source == "website"
            and instance.status == "pending"
            and instance.payment_status == "paid"
        ):  # Assuming website 'pending' + 'paid' means ready for kitchen
            can_print_kitchen_ticket = True

    if can_print_kitchen_ticket:
        if not instance.kitchen_ticket_printed:
            logger.info(
                f"Order {instance.id}: Conditions met and kitchen_ticket_printed is False. Setting flag and scheduling direct print."
            )
            instance.kitchen_ticket_printed = True  # Mark in-memory
            try:
                # Save only this flag to prevent recursion and other signal interference
                # This save will re-trigger this signal. The 'kitchen_ticket_printed' check prevents infinite loop.
                instance.save(update_fields=["kitchen_ticket_printed"])
                logger.info(
                    f"Order {instance.id}: kitchen_ticket_printed flag updated to True in DB."
                )
                transaction.on_commit(lambda: print_kitchen_and_qc_tickets(instance.id))
            except Exception as e_save_flag:
                logger.error(
                    f"Order {instance.id}: FAILED to save kitchen_ticket_printed flag: {e_save_flag}",
                    exc_info=True,
                )
        else:
            logger.info(
                f"Order {instance.id}: Direct kitchen print conditions met, but kitchen_ticket_printed is already True."
            )
    elif not created:
        logger.debug(
            f"Order {instance.id}: Direct kitchen print conditions NOT met. Source: {instance.source}, Status: {instance.status}, PaymentStatus: {instance.payment_status}, PrintedFlag: {instance.kitchen_ticket_printed}"
        )

    # --- 3. POS Agent Print Job Trigger ---
    # This section handles triggering prints via the POS Hardware Agent
    # It uses the 'pos_print_jobs_sent' flag.

    # Determine if conditions are met to send print jobs to agent
    should_send_agent_jobs = False
    log_reason_agent = ""
    if not instance.pos_print_jobs_sent:  # Only if not already sent
        if instance.source == "website" and instance.payment_status == "paid":
            should_send_agent_jobs = True
            log_reason_agent = "Website order paid and agent jobs not yet sent."
        elif (
            instance.source == "pos"
            and instance.status == "completed"
            and instance.payment_status == "paid"
        ):
            should_send_agent_jobs = True
            log_reason_agent = (
                "POS order completed & paid, and agent jobs not yet sent."
            )

    if should_send_agent_jobs:
        logger.info(
            f"Order {instance.id}: {log_reason_agent} Scheduling POS agent print jobs."
        )
        instance.pos_print_jobs_sent = True  # Mark in-memory to prevent re-queuing by this signal invocation on subsequent saves within same transaction

        # Prepare job list (ensure OrderSerializer has these methods or adapt)
        pos_print_job_serializer = OrderSerializer(instance)
        print_jobs_list = []
        qc_payload = getattr(
            pos_print_job_serializer, "get_kitchen_qc_payload", lambda o: None
        )(instance)
        if qc_payload:
            print_jobs_list.append(
                {
                    "printer_id": "kitchen_qc_printer",
                    "ticket_type": "kitchen_qc_ticket",
                    "ticket_data": qc_payload,
                }
            )
        drinks_payload = getattr(
            pos_print_job_serializer, "get_kitchen_drinks_payload", lambda o: None
        )(instance)
        if drinks_payload:
            print_jobs_list.append(
                {
                    "printer_id": "kitchen_drinks_printer",
                    "ticket_type": "kitchen_drinks_ticket",
                    "ticket_data": drinks_payload,
                }
            )

        if print_jobs_list:
            pos_group_name = (
                "pos_updates_location_default_location"  # Determine group name
            )
            logger.debug(
                f"Order {instance.id}: Sending {len(print_jobs_list)} jobs to POS agent group '{pos_group_name}'."
            )
            async_to_sync(channel_layer.group_send)(
                pos_group_name,
                {
                    "type": "send.print.jobs",
                    "order_id": str(instance.id),
                    "print_jobs": print_jobs_list,
                },
            )

            # Defer DB update of the flag until commit
            def mark_agent_jobs_sent_on_commit():
                Order.objects.filter(pk=instance.pk).update(pos_print_jobs_sent=True)
                logger.info(
                    f"Order {instance.id}: Flag 'pos_print_jobs_sent' DB update to True (agent jobs sent) after commit."
                )

            transaction.on_commit(mark_agent_jobs_sent_on_commit)
        else:  # No jobs generated, but conditions were met
            logger.info(
                f"Order {instance.id}: Agent print job conditions met, but no specific jobs generated by serializer."
            )

            def mark_agent_jobs_flag_anyway_on_commit():  # Still mark flag to prevent reprocessing this event
                Order.objects.filter(pk=instance.pk).update(pos_print_jobs_sent=True)
                logger.info(
                    f"Order {instance.id}: Flag 'pos_print_jobs_sent' DB update to True (no agent jobs) after commit."
                )

            transaction.on_commit(mark_agent_jobs_flag_anyway_on_commit)

    elif instance.pos_print_jobs_sent and (
        (instance.source == "website" and instance.payment_status == "paid")
        or (
            instance.source == "pos"
            and instance.status == "completed"
            and instance.payment_status == "paid"
        )
    ):
        logger.info(
            f"Order {instance.id}: POS agent print job conditions met, but 'pos_print_jobs_sent' is already True."
        )

    # --- 4. Inventory Deduction ---
    # Check if order is completed, paid, and inventory has not been processed yet.
    if (
        instance.status == "completed"
        and instance.payment_status == "paid"
        and not instance.inventory_processed_for_completion
    ):

        logger.info(
            f"Order {instance.id}: Conditions met for inventory deduction "
            f"(Status: {instance.status}, Payment: {instance.payment_status}, InvProcessedFlag: {instance.inventory_processed_for_completion}). "
            f"Scheduling deduction."
        )
        # Mark the flag in-memory for the current instance.
        # This helps prevent this same signal *invocation* from re-queueing if the instance is saved again
        # before the transaction commits (e.g., by another part of this signal).
        # The actual DB update of this flag is handled by `deduct_inventory_for_order`.
        instance.inventory_processed_for_completion = True

        transaction.on_commit(lambda: deduct_inventory_for_order(instance.id))

    elif (
        instance.status == "completed"
        and instance.payment_status == "paid"
        and instance.inventory_processed_for_completion
    ):
        logger.info(
            f"Order {instance.id}: Is completed and paid, but 'inventory_processed_for_completion' is already True. Skipping inventory deduction queue."
        )


# Keep the print_kitchen_and_qc_tickets and recalculate_and_broadcast_prep_times functions as they are,
# assuming they are correct for their specific tasks.
# Make sure they are defined before being called if you move them around.


def recalculate_and_broadcast_prep_times():
    """
    Recalculates the estimated preparation times for all pending website orders
    and broadcasts the updates via WebSocket.
    """
    pending_orders = Order.objects.filter(status="pending", source="website").order_by(
        "created_at"
    )
    logger.debug(
        f"Recalculating preparation times for {pending_orders.count()} pending orders"
    )
    channel_layer = get_channel_layer()
    for index, order in enumerate(pending_orders):
        estimated_time = (index + 1) * 15
        try:
            async_to_sync(channel_layer.group_send)(
                f"website_order_{order.id}",
                {
                    "type": "prep_time_update",
                    "estimated_preparation_time": estimated_time,
                },
            )
            logger.debug(
                f"Broadcast updated prep time for order {order.id}: {estimated_time} min"
            )
        except Exception as e:
            logger.error(f"Error broadcasting prep time for order {order.id}: {str(e)}")


def print_kitchen_and_qc_tickets(order_id):
    """Fetches the order and triggers printing to configured station/QC printers."""
    logger.info(
        f"--- Attempting print_kitchen_and_qc_tickets for Order ID: {order_id} ---"
    )
    try:
        order = Order.objects.prefetch_related("items__product__category").get(
            id=order_id
        )
        printer_configs = getattr(settings, "HARDWARE_CONFIG", {}).get("PRINTERS", {})
        logger.debug(
            f"Order {order_id}: Fetched successfully. Printer configs found: {list(printer_configs.keys())}"
        )
        controller = ReceiptPrinterController()

        for name, config in printer_configs.items():
            logger.debug(
                f"Order {order_id}: Checking printer config '{name}': Enabled={config.get('enabled')}, Role={config.get('role')}"
            )
            if not config.get("enabled", False):
                continue
            role = config.get("role")
            result = None
            if role == "station":
                logger.info(
                    f"Order {order_id}: Attempting to print to STATION printer '{name}'..."
                )
                result = controller.print_station_ticket(order, name)
            elif role == "quality_control":
                logger.info(
                    f"Order {order_id}: Attempting to print to QC printer '{name}'..."
                )
                result = controller.print_qc_ticket(order, name)

            if result:
                logger.info(
                    f"Order {order_id}: Result from printer '{name}': {result.get('status')} - {result.get('message')}"
                )
            elif role in [
                "station",
                "quality_control",
            ]:  # Only log no result if it was a role we tried to print for
                logger.error(
                    f"Order {order_id}: No result returned from printer '{name}' for role '{role}'"
                )

        logger.info(f"--- Finished print attempt loop for Order ID: {order_id} ---")
    except Order.DoesNotExist:
        logger.error(f"Order with ID {order_id} not found for printing.")
    except Exception as e:
        logger.error(
            f"Unexpected error in print_kitchen_and_qc_tickets for Order ID {order_id}: {e}",
            exc_info=True,
        )
