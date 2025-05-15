# orders/signals.py
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.db import transaction
from django.conf import settings  # Import settings
from .models import Order  # Your Order model, ensure it has 'pos_print_jobs_sent' field
from .serializers import OrderSerializer  # Main serializer for POS print jobs
from .kitchen.serializers import KitchenOrderSerializer  # For Kitchen Display Screen


# Import the updated controller
from hardware.controllers.receipt_printer import ReceiptPrinterController

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Order)
def order_status_update(sender, instance, created, update_fields=None, **kwargs):
    """
    Universal handler for order status changes.
    Triggers WebSocket updates and station/QC printing based on status transitions,
    using a flag to prevent duplicate printing.
    """
    channel_layer = get_channel_layer()

    # --- WebSocket updates (Keep existing logic) ---
    if instance.source == "website":
        logger.debug(f"Website order {instance.id} status changed to {instance.status}")
        async_to_sync(channel_layer.group_send)(
            f"website_order_{instance.id}",
            {
                "type": "status_update",
                "status": instance.status,
                "payment_status": instance.payment_status,
            },
        )

    relevant_pos_statuses = ["saved", "in_progress", "completed", "voided"]
    relevant_website_statuses = ["pending", "preparing", "completed", "cancelled"]
    should_update_kitchen = (
        instance.source == "pos" and instance.status in relevant_pos_statuses
    ) or (instance.source == "website" and instance.status in relevant_website_statuses)
    if should_update_kitchen:
        order_data = KitchenOrderSerializer(instance).data
        message_type = "new_order" if created else "order_update"
        async_to_sync(channel_layer.group_send)(
            "kitchen_orders", {"type": message_type, "order": order_data}
        )
        logger.debug(
            f"Sent {message_type} for {instance.source} order {instance.id} to kitchen display"
        )
    # --- End WebSocket updates ---

    # --- Station/QC Printing Trigger Condition (Checks Status AND Print Flag) ---
    should_check_flag = False  # Flag to indicate if status condition met

    # Check status conditions only on updates, not initial creation
    if not created:
        # Condition 1: POS order payment is completed
        if instance.source == "pos" and instance.payment_status == "paid":
            logger.info(
                f"Order {instance.id}: POS Payment status IS 'paid' on update. Will check print flag."
            )
            should_check_flag = True

        # Condition 2: Website order moves to preparation stage
        elif instance.source == "website" and instance.status == "pending":
            logger.info(
                f"Order {instance.id}: Website Status IS 'preparing' on update. Will check print flag."
            )
            should_check_flag = True

    # --- Check Print Flag and Schedule Printing ---
    if should_check_flag:
        # --- Check the kitchen_ticket_printed flag ---
        if not instance.kitchen_ticket_printed:
            logger.info(
                f"Order {instance.id}: Status condition met AND kitchen ticket not printed yet. Setting flag and scheduling print."
            )
            # Set the flag to True *before* scheduling the print
            instance.kitchen_ticket_printed = True
            # Save *only* this flag update, using update_fields to prevent recursion!
            try:
                # Use a specific save call just for the flag
                instance.save(update_fields=["kitchen_ticket_printed"])
                logger.info(
                    f"Order {instance.id}: kitchen_ticket_printed flag saved successfully."
                )
                # Schedule the actual printing function to run after the transaction commits
                transaction.on_commit(lambda: print_kitchen_and_qc_tickets(instance.id))
            except Exception as save_err:
                # Log error if saving the flag fails
                logger.error(
                    f"Order {instance.id}: CRITICAL ERROR - Failed to save kitchen_ticket_printed flag: {save_err}",
                    exc_info=True,
                )
                # Consider how to handle this - maybe try printing anyway? Or log prominently.

        else:
            # If the flag is already True, log it and do nothing more
            logger.info(
                f"Order {instance.id}: Status condition met BUT kitchen_ticket_printed flag is already True. Skipping duplicate print."
            )
            # --- End Check ---
    else:
        # Log why the initial status condition wasn't met (useful for debugging)
        if not created:  # Only log non-met conditions for updates
            logger.debug(
                f"Order {instance.id}: Status conditions NOT met for printing station/QC tickets this time (Source: {instance.source}, Status: {instance.status}, PaymentStatus: {instance.payment_status})"
            )
        pass


def recalculate_and_broadcast_prep_times():
    """
    Recalculates the estimated preparation times for all pending website orders
    and broadcasts the updates via WebSocket.
    """
    # Get all pending website orders, ordered by creation time
    pending_orders = Order.objects.filter(status="pending", source="website").order_by(
        "created_at"
    )

    print(
        f"Recalculating preparation times for {pending_orders.count()} pending orders"
    )

    # Get the channel layer for WebSocket communication
    channel_layer = get_channel_layer()

    # Calculate and broadcast updated preparation times
    for index, order in enumerate(pending_orders):
        # Each order takes 15 minutes; position in queue determines time
        estimated_time = (index + 1) * 15

        # Broadcast to the specific order's group
        try:
            async_to_sync(channel_layer.group_send)(
                f"website_order_{order.id}",
                {
                    "type": "prep_time_update",
                    "estimated_preparation_time": estimated_time,
                },
            )
            print(
                f"Broadcast updated prep time for order {order.id}: {estimated_time} min"
            )
        except Exception as e:
            print(f"Error broadcasting prep time for order {order.id}: {str(e)}")


# --- Keep the print_kitchen_and_qc_tickets function as is (with logging) ---
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
                if result:
                    logger.info(
                        f"Order {order_id}: Result from print_station_ticket('{name}'): {result.get('status')} - {result.get('message')}"
                    )
                else:
                    logger.error(
                        f"Order {order_id}: No result returned from print_station_ticket('{name}')"
                    )

            elif role == "quality_control":
                logger.info(
                    f"Order {order_id}: Attempting to print to QC printer '{name}'..."
                )
                result = controller.print_qc_ticket(order, name)
                if result:
                    logger.info(
                        f"Order {order_id}: Result from print_qc_ticket('{name}'): {result.get('status')} - {result.get('message')}"
                    )
                else:
                    logger.error(
                        f"Order {order_id}: No result returned from print_qc_ticket('{name}')"
                    )

        logger.info(f"--- Finished print attempt loop for Order ID: {order_id} ---")

    except Order.DoesNotExist:
        logger.error(f"Order with ID {order_id} not found for printing.")
    except Exception as e:
        logger.error(
            f"Unexpected error in print_kitchen_and_qc_tickets for Order ID {order_id}: {e}",
            exc_info=True,
        )


@receiver(post_save, sender=Order)
def order_event_handler(
    sender, instance: Order, created: bool, update_fields=None, **kwargs
):
    channel_layer = get_channel_layer()

    # --- 1. Customer-facing Website Order Status Updates ---
    if instance.source == "website":
        # ... (existing logic for customer status) ...
        logger.debug(
            f"Order {instance.id}: Sending customer status (Status: {instance.status}, Payment: {instance.payment_status}) to website_order_{instance.id}"
        )
        async_to_sync(channel_layer.group_send)(
            f"website_order_{instance.id}",
            {
                "type": "status_update",
                "status": instance.status,
                "payment_status": instance.payment_status,
            },
        )

    # --- 2. Kitchen Display Screen (KDS) Updates ---
    should_update_kds = False
    if instance.source == "pos" and instance.status in [
        "saved",
        "in-progress",
        "completed",
        "voided",
    ]:
        should_update_kds = True
    elif (
        instance.source == "website"
        and instance.payment_status == "paid"
        and instance.status in ["pending", "preparing", "completed", "cancelled"]
    ):
        should_update_kds = True

    if should_update_kds:
        # ... (existing logic for KDS updates) ...
        kds_serializer = KitchenOrderSerializer(instance)
        kds_order_data = kds_serializer.data
        kds_message_type = "order_update"
        if created and instance.status not in ["completed", "voided", "cancelled"]:
            kds_message_type = "new_order"
        logger.debug(
            f"Order {instance.id}: Sending KDS {kds_message_type} to kitchen_orders group."
        )
        async_to_sync(channel_layer.group_send)(
            "kitchen_orders", {"type": kds_message_type, "order": kds_order_data}
        )

    # --- 3. Print Job Trigger for POS Frontend -> Agent ---
    print_jobs_trigger_met = False
    log_reason = ""

    # Check if the flag is already true for this instance *before* checking conditions.
    # This helps if the instance passed to the signal handler is stale in a rapid save sequence.
    # We fetch the latest state of the flag from DB.
    try:
        # It's generally better to pass the instance around, but for a flag check like this,
        # a fresh fetch can avoid issues with stale instance data if multiple saves are happening.
        # However, instance.refresh_from_db() is usually preferred if you need to update the instance.
        # For now, let's rely on the transaction.on_commit to set the flag and the initial check.
        current_pos_print_jobs_sent = instance.pos_print_jobs_sent
    except Order.DoesNotExist:  # Should not happen if instance exists
        logger.error(
            f"Order {instance.id}: Does not exist when checking pos_print_jobs_sent flag. Aborting print trigger."
        )
        return

    if instance.source == "website":
        if instance.payment_status == "paid" and not current_pos_print_jobs_sent:
            print_jobs_trigger_met = True
            log_reason = "Website order paid and jobs not yet sent."
    elif instance.source == "pos":
        if instance.status == "completed" and not current_pos_print_jobs_sent:
            print_jobs_trigger_met = True
            log_reason = "POS order completed and kitchen print jobs not yet sent."

    if print_jobs_trigger_met:
        logger.info(
            f"Order {instance.id} (Source: {instance.source}): Triggering print jobs for POS agent. Reason: {log_reason}"
        )

        # --- Important: Set flag immediately on the instance for subsequent signal calls in same transaction sequence ---
        # This is an in-memory change to the instance being processed by this specific signal invocation.
        # The database update is still deferred with transaction.on_commit.
        instance.pos_print_jobs_sent = (
            True  # Mark as being processed by *this* signal invocation
        )

        pos_print_job_serializer = OrderSerializer(instance)
        print_jobs_list = []

        if instance.source == "website":
            qc_payload = pos_print_job_serializer.get_kitchen_qc_payload(instance)
            if qc_payload:
                print_jobs_list.append(
                    {
                        "printer_id": "kitchen_qc_printer",
                        "ticket_type": "kitchen_qc_ticket",
                        "ticket_data": qc_payload,
                    }
                )
            drinks_payload = pos_print_job_serializer.get_kitchen_drinks_payload(
                instance
            )
            if drinks_payload:
                print_jobs_list.append(
                    {
                        "printer_id": "kitchen_drinks_printer",
                        "ticket_type": "kitchen_drinks_ticket",
                        "ticket_data": drinks_payload,
                    }
                )

        elif instance.source == "pos":  # Only kitchen tickets
            qc_payload_pos = pos_print_job_serializer.get_kitchen_qc_payload(instance)
            if qc_payload_pos:
                print_jobs_list.append(
                    {
                        "printer_id": "kitchen_qc_printer",
                        "ticket_type": "kitchen_qc_ticket",
                        "ticket_data": qc_payload_pos,
                    }
                )
            drinks_payload_pos = pos_print_job_serializer.get_kitchen_drinks_payload(
                instance
            )
            if drinks_payload_pos:
                print_jobs_list.append(
                    {
                        "printer_id": "kitchen_drinks_printer",
                        "ticket_type": "kitchen_drinks_ticket",
                        "ticket_data": drinks_payload_pos,
                    }
                )

        if print_jobs_list:
            pos_group_name = "pos_updates_location_default_location"
            if hasattr(instance, "location") and instance.location:
                location_identifier = getattr(
                    instance.location, "id_string", instance.location.pk
                )
                pos_group_name = f"pos_updates_location_{location_identifier}"
            else:
                logger.warning(
                    f"Order {instance.id}: Defaulting POS group '{pos_group_name}'."
                )

            logger.debug(
                f"Order {instance.id}: Sending {len(print_jobs_list)} print jobs to POS group '{pos_group_name}'."
            )
            async_to_sync(channel_layer.group_send)(
                pos_group_name,
                {
                    "type": "send.print.jobs",
                    "order_id": str(instance.id),
                    "print_jobs": print_jobs_list,
                },
            )

            # Defer the database update of the flag until the transaction commits.
            # This ensures it's only set if the whole operation (including all saves that triggered this) is successful.
            def mark_pos_jobs_sent_on_commit():
                Order.objects.filter(pk=instance.pk).update(pos_print_jobs_sent=True)
                logger.info(
                    f"Order {instance.id}: Flag 'pos_print_jobs_sent' DB update to True after commit (jobs sent: {len(print_jobs_list)})."
                )

            transaction.on_commit(mark_pos_jobs_sent_on_commit)
        else:
            logger.info(
                f"Order {instance.id}: Trigger condition met, but no kitchen print jobs by serializer. Source: {instance.source}, Status: {instance.status}."
            )

            # Even if no jobs, set the flag to prevent re-evaluation for THIS specific trigger event.
            def mark_pos_jobs_sent_anyway_on_commit():
                Order.objects.filter(pk=instance.pk).update(pos_print_jobs_sent=True)
                logger.info(
                    f"Order {instance.id}: Flag 'pos_print_jobs_sent' DB update (no specific kitchen jobs generated) after commit."
                )

            transaction.on_commit(mark_pos_jobs_sent_anyway_on_commit)
    elif (
        not print_jobs_trigger_met
        and (
            instance.source == "pos"
            and instance.status == "completed"
            and current_pos_print_jobs_sent
        )
        or (
            instance.source == "website"
            and instance.payment_status == "paid"
            and current_pos_print_jobs_sent
        )
    ):
        logger.info(
            f"Order {instance.id}: Print job trigger conditions met (Source: {instance.source}, Status: {instance.status}, Payment: {instance.payment_status}), but 'pos_print_jobs_sent' is already True. No action taken."
        )
