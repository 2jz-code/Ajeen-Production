# combined/backend/payments/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated  # AllowAny
from users.permissions import IsAdminUser
from users.authentication import WebsiteCookieJWTAuthentication
from django.conf import settings
from .serializers import PaymentSerializer
from django.shortcuts import get_object_or_404
from orders.models import Order, Cart

# from hardware.controllers.receipt_printer import ReceiptPrinterController # Commented out as not directly used in this modification
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from .models import Payment, PaymentTransaction
from .stripe_utils import create_payment_intent  # ensure this is robust
import stripe
import decimal
from django.utils import timezone
from django.db import transaction
import json
import logging
from django.db.models import Q

stripe.api_key = settings.STRIPE_SECRET_KEY
logger = logging.getLogger(__name__)


def mark_cart_as_checked_out(order):
    try:
        cart_to_checkout = None
        if order.user:
            cart_to_checkout = Cart.objects.filter(
                user=order.user, checked_out=False
            ).first()
        elif order.guest_id:
            cart_to_checkout = Cart.objects.filter(
                guest_id=order.guest_id, checked_out=False
            ).first()

        if cart_to_checkout:
            cart_to_checkout.checked_out = True
            cart_to_checkout.save()
            logger.info(
                f"Cart {cart_to_checkout.id} associated with Order {order.id} marked as checked_out."
            )
        else:
            logger.warning(
                f"No active cart found to mark as checked_out for Order {order.id}."
            )
    except Exception as e:
        logger.error(
            f"Error marking cart as checked_out for Order {order.id}: {e}",
            exc_info=True,
        )


class CreatePaymentIntentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        order_id = request.data.get("order_id")
        if not order_id:
            return Response(
                {"error": "Order ID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            order = get_object_or_404(Order, id=order_id)
            payment, created = Payment.objects.get_or_create(
                order=order, defaults={"amount": order.total_price, "status": "pending"}
            )

            amount_cents = int(decimal.Decimal(order.total_price) * 100)
            metadata = {"order_id": str(order.id)}
            if order.guest_email:
                metadata["customer_email"] = order.guest_email
            elif order.user and order.user.email:
                metadata["customer_email"] = order.user.email

            # Ensure payment intent is created with the latest order details if payment object already existed
            if not created and payment.amount != order.total_price:
                payment.amount = order.total_price
                payment.save()

            payment_intent_obj = create_payment_intent(
                amount=amount_cents, currency="usd", metadata=metadata
            )
            logger.info(
                f"Created Payment Intent {payment_intent_obj.id} for Order {order_id}"
            )

            return Response(
                {
                    "clientSecret": payment_intent_obj.client_secret,
                    "publishableKey": settings.STRIPE_PUBLISHABLE_KEY,
                    "amount": float(order.total_price),
                    "orderId": order.id,
                    "paymentIntentId": payment_intent_obj.id,  # Return PI ID
                }
            )

        except Order.DoesNotExist:
            logger.error(f"Order not found for ID: {order_id}")
            return Response(
                {"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(
                f"Error creating payment intent for order {order_id}: {e}",
                exc_info=True,
            )
            return Response(
                {"error": f"Failed to create payment intent: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@method_decorator(csrf_exempt, name="dispatch")
class PaymentWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
        event = None

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
            logger.info(f"Webhook received: {event.type} (ID: {event.id})")
        except ValueError:
            logger.error("Webhook Error: Invalid payload")
            return Response(status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError:
            logger.error("Webhook Error: Invalid signature")
            return Response(status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(
                f"Webhook Error: Unexpected error during construction: {e}",
                exc_info=True,
            )
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            with transaction.atomic():
                if event.type == "payment_intent.succeeded":
                    payment_intent = event.data.object
                    self.handle_payment_success(payment_intent)
                elif event.type == "payment_intent.payment_failed":
                    payment_intent = event.data.object
                    self.handle_payment_failure(payment_intent)
                elif event.type == "payment_intent.canceled":  # New
                    payment_intent = event.data.object
                    self.handle_payment_intent_canceled(payment_intent)
                elif (
                    event.type == "charge.refunded"
                ):  # Keep for compatibility if old refunds trigger this
                    refund = event.data.object
                    self.handle_legacy_refund(refund)
                elif event.type == "refund.created":  # New: Modern refund event
                    refund = event.data.object
                    self.handle_refund_created(refund)
                elif (
                    event.type == "refund.updated"
                ):  # New: To catch refund failures primarily
                    refund = event.data.object
                    self.handle_refund_updated(refund)
                elif event.type == "charge.dispute.created":  # New
                    dispute = event.data.object
                    self.handle_dispute_created(dispute)
                elif event.type == "charge.dispute.closed":  # New
                    dispute = event.data.object
                    self.handle_dispute_closed(dispute)
                elif event.type == "charge.dispute.updated":  # New
                    dispute = event.data.object
                    self.handle_dispute_updated(dispute)
                # Terminal Events
                elif event.type == "terminal.reader.action_succeeded":  # New
                    reader_action = event.data.object
                    self.handle_terminal_action_succeeded(reader_action)
                elif event.type == "terminal.reader.action_failed":  # New
                    reader_action = event.data.object
                    self.handle_terminal_action_failed(reader_action)
                else:
                    logger.info(f"Webhook: Unhandled event type {event.type}")

        except Exception as e:
            logger.error(
                f"Error handling webhook event {event.type} (ID: {event.id}): {e}",
                exc_info=True,
            )
            # Return 200 to Stripe to acknowledge receipt and prevent retries for application errors.
            # The error is logged for internal investigation.
        return Response(status=status.HTTP_200)

    def _get_or_create_payment_and_transaction(
        self,
        payment_intent_id,
        charge_id=None,
        amount_decimal=None,
        default_status="pending",
        payment_intent_obj=None,
    ):
        """Helper to retrieve or create Payment and PaymentTransaction from a PaymentIntent ID"""
        txn = PaymentTransaction.objects.filter(
            transaction_id=payment_intent_id
        ).first()
        if (
            not txn and charge_id
        ):  # Fallback if PI was not stored as transaction_id directly
            txn = PaymentTransaction.objects.filter(transaction_id=charge_id).first()

        payment = None
        order = None

        if txn:
            payment = txn.parent_payment
            order = payment.order
            return payment, txn, order

        # If no transaction, try to find/create from PaymentIntent metadata
        if not payment_intent_obj:  # Fetch if not provided
            try:
                payment_intent_obj = stripe.PaymentIntent.retrieve(payment_intent_id)
            except Exception as e:
                logger.error(
                    f"Webhook Helper: Could not retrieve PI {payment_intent_id} from Stripe: {e}"
                )
                return None, None, None

        order_id = payment_intent_obj.metadata.get("order_id")
        if not order_id:
            logger.error(
                f"Webhook Helper: PaymentIntent {payment_intent_id} has no order_id in metadata."
            )
            return None, None, None

        try:
            order = Order.objects.get(id=order_id)
            current_amount_decimal = (
                decimal.Decimal(payment_intent_obj.amount) / 100
                if payment_intent_obj
                else amount_decimal
            )

            payment, _ = Payment.objects.get_or_create(
                order=order,
                defaults={"amount": current_amount_decimal, "status": "pending"},
            )
            # Ensure payment amount is up-to-date if it existed
            if payment.amount != current_amount_decimal:
                payment.amount = current_amount_decimal
                # payment.status = "pending" # Reset if processing a new PI for an old payment
                payment.save()

            # Use charge_id if available (preferred for successful payments), else PI ID.
            effective_transaction_id = charge_id or payment_intent_id

            txn, created = PaymentTransaction.objects.get_or_create(
                parent_payment=payment,
                transaction_id=effective_transaction_id,
                defaults={
                    "payment_method": "credit",  # Assume credit for PI events
                    "amount": current_amount_decimal,
                    "status": default_status,
                },
            )
            if created:
                logger.info(
                    f"Webhook Helper: Created new PaymentTransaction {txn.id} for PI {payment_intent_id} / Charge {charge_id} with status {default_status}"
                )
            return payment, txn, order
        except Order.DoesNotExist:
            logger.error(
                f"Webhook Helper: Order {order_id} from PI {payment_intent_id} metadata not found."
            )
        except Exception as e:
            logger.error(
                f"Webhook Helper: Error getting/creating payment/transaction for PI {payment_intent_id}: {e}",
                exc_info=True,
            )

        return None, None, None

    def handle_payment_success(self, payment_intent):
        pi_id = payment_intent.id
        charge_id = payment_intent.latest_charge
        logger.info(f"Webhook Success Handler: PI ID {pi_id}, Charge ID {charge_id}")

        payment, txn, order = self._get_or_create_payment_and_transaction(
            payment_intent_id=pi_id,
            charge_id=charge_id,
            amount_decimal=decimal.Decimal(payment_intent.amount) / 100,
            default_status="completed",
            payment_intent_obj=payment_intent,
        )

        if not txn:
            logger.error(
                f"Webhook Success: Could not find/create transaction for PI {pi_id}."
            )
            return

        if txn.status == "completed":
            logger.info(
                f"Webhook Info: Transaction {txn.id} for PI {pi_id} already marked completed."
            )
            return

        txn.status = "completed"
        # Ensure charge_id is the transaction_id for successful PI
        if charge_id and txn.transaction_id != charge_id:
            # This case implies txn was found by pi_id, now update to charge_id
            logger.info(
                f"Webhook Success: Updating transaction_id for Txn {txn.id} from {txn.transaction_id} to Charge ID {charge_id}"
            )
            # Check if a transaction with this charge_id already exists to avoid unique constraint errors
            existing_txn_with_charge_id = (
                PaymentTransaction.objects.filter(transaction_id=charge_id)
                .exclude(id=txn.id)
                .first()
            )
            if existing_txn_with_charge_id:
                logger.warning(
                    f"Webhook Success: Another transaction {existing_txn_with_charge_id.id} already has Charge ID {charge_id}. Keeping PI ID {pi_id} for Txn {txn.id}."
                )
            else:
                txn.transaction_id = charge_id

        metadata = txn.get_metadata()
        try:
            if payment_intent.payment_method:
                pm = stripe.PaymentMethod.retrieve(payment_intent.payment_method)
                if pm and pm.card:
                    metadata["card_brand"] = pm.card.brand
                    metadata["card_last4"] = pm.card.last4
        except Exception as e:
            logger.warning(
                f"Webhook Success: Could not retrieve PM details for PI {pi_id}: {e}"
            )
        txn.set_metadata(metadata)
        txn.save()
        logger.info(
            f"Webhook: Updated PaymentTransaction {txn.id} to completed (PI: {pi_id})."
        )

        if payment:
            self.update_parent_payment_status(
                payment, "paid"
            )  # Explicitly pass desired order status

    def handle_payment_failure(self, payment_intent):
        pi_id = payment_intent.id
        logger.info(f"Webhook Failure Handler: PI ID {pi_id}")

        payment, txn, order = self._get_or_create_payment_and_transaction(
            payment_intent_id=pi_id,
            amount_decimal=decimal.Decimal(payment_intent.amount) / 100,
            default_status="failed",
            payment_intent_obj=payment_intent,
        )

        if not txn:
            logger.error(
                f"Webhook Failure: Could not find/create transaction for PI {pi_id}."
            )
            return

        if txn.status == "failed":  # Already processed
            logger.info(
                f"Webhook Info: Transaction {txn.id} for PI {pi_id} already marked failed."
            )
            return

        txn.status = "failed"
        metadata = txn.get_metadata()
        last_error = payment_intent.last_payment_error
        metadata["failure_reason"] = last_error.message if last_error else "Unknown"
        metadata["failure_code"] = last_error.code if last_error else "unknown"
        txn.set_metadata(metadata)
        txn.save()
        logger.info(
            f"Webhook: Updated PaymentTransaction {txn.id} to failed (PI: {pi_id})."
        )

        if payment:
            self.update_parent_payment_status(payment, "failed")

    def handle_payment_intent_canceled(self, payment_intent):
        pi_id = payment_intent.id
        logger.info(f"Webhook Canceled Handler: PI ID {pi_id}")

        payment, txn, order = self._get_or_create_payment_and_transaction(
            payment_intent_id=pi_id,
            amount_decimal=decimal.Decimal(payment_intent.amount) / 100,
            default_status="canceled",
            payment_intent_obj=payment_intent,
        )

        if not txn:
            logger.error(
                f"Webhook Canceled: Could not find/create transaction for PI {pi_id}."
            )
            return

        if txn.status == "canceled":
            logger.info(
                f"Webhook Info: Transaction {txn.id} for PI {pi_id} already marked canceled."
            )
            return

        txn.status = "canceled"
        metadata = txn.get_metadata()
        metadata["cancellation_reason"] = payment_intent.cancellation_reason
        txn.set_metadata(metadata)
        txn.save()
        logger.info(
            f"Webhook: Updated PaymentTransaction {txn.id} to canceled (PI: {pi_id})."
        )

        if payment:
            self.update_parent_payment_status(payment, "canceled")

    def handle_legacy_refund(self, refund_obj):
        # This handles the old `charge.refunded` event.
        charge_id = refund_obj.charge
        refund_id = refund_obj.id
        logger.info(
            f"Webhook Legacy Refund Handler: Refund ID {refund_id}, Charge ID {charge_id}"
        )

        txn = PaymentTransaction.objects.filter(transaction_id=charge_id).first()
        if not txn:
            logger.warning(
                f"Webhook Legacy Refund: No PaymentTransaction found for Charge {charge_id}."
            )
            return

        if txn.status == "refunded":  # Fully refunded
            logger.info(
                f"Webhook Info: Transaction {txn.id} for Charge {charge_id} already marked refunded."
            )
            # Potentially check for partial refunds if your system supports sub-transaction refunds
            return

        txn.status = "refunded"  # Assume full refund by this event
        metadata = txn.get_metadata()
        refund_data = metadata.get("refunds", [])
        refund_data.append(
            {
                "refund_id_webhook": refund_id,
                "amount_webhook": decimal.Decimal(refund_obj.amount) / 100,
                "reason_webhook": refund_obj.reason,
                "status_webhook": refund_obj.status,  # usually 'succeeded' for charge.refunded
                "type": "legacy_charge_refunded",
            }
        )
        metadata["refunds"] = refund_data
        txn.set_metadata(metadata)
        txn.save()
        logger.info(
            f"Webhook: Updated PaymentTransaction {txn.id} to refunded (Charge: {charge_id}) via legacy event."
        )

        self.update_parent_payment_status(txn.parent_payment)

    def handle_refund_created(self, refund_obj):
        charge_id = refund_obj.charge
        pi_id = refund_obj.payment_intent
        refund_id = refund_obj.id
        logger.info(
            f"Webhook Refund Created Handler: Refund ID {refund_id}, Charge ID {charge_id}, PI ID {pi_id}"
        )

        # Prefer finding transaction by charge_id if available, else by payment_intent_id
        txn_identifier = charge_id or pi_id
        txn = PaymentTransaction.objects.filter(transaction_id=txn_identifier).first()

        if not txn:
            logger.warning(
                f"Webhook Refund Created: No PaymentTransaction for identifier {txn_identifier}."
            )
            return

        metadata = txn.get_metadata()
        refunds_list = metadata.get("refunds", [])

        existing_refund_entry = next(
            (r for r in refunds_list if r.get("refund_id_webhook") == refund_id), None
        )
        if existing_refund_entry:
            logger.info(
                f"Webhook Refund Created: Refund {refund_id} already logged for Txn {txn.id}. Updating status if needed."
            )
            existing_refund_entry["status_webhook"] = refund_obj.status
            existing_refund_entry["reason_webhook"] = refund_obj.reason
        else:
            refunds_list.append(
                {
                    "refund_id_webhook": refund_id,
                    "amount_webhook": decimal.Decimal(refund_obj.amount) / 100,
                    "reason_webhook": refund_obj.reason,
                    "status_webhook": refund_obj.status,  # e.g., 'succeeded', 'pending', 'requires_action'
                    "currency": refund_obj.currency,
                    "created_at_webhook": timezone.datetime.fromtimestamp(
                        refund_obj.created
                    ).isoformat(),
                    "type": "refund.created",
                }
            )
        metadata["refunds"] = refunds_list
        txn.set_metadata(metadata)

        # Don't change txn.status to "refunded" yet, wait for refund.updated or rely on update_parent_payment_status
        # if the refund_obj.status is 'succeeded'.
        if refund_obj.status == "succeeded":
            # If a new refund succeeded, we might need to update status immediately
            # This logic is tricky with partial refunds. update_parent_payment_status should handle it.
            logger.info(
                f"Webhook Refund Created: Refund {refund_id} succeeded for Txn {txn.id}."
            )

        txn.save()  # Save metadata
        self.update_parent_payment_status(txn.parent_payment)

    def handle_refund_updated(self, refund_obj):
        charge_id = refund_obj.charge
        pi_id = refund_obj.payment_intent
        refund_id = refund_obj.id
        logger.info(
            f"Webhook Refund Updated Handler: Refund ID {refund_id} status {refund_obj.status}"
        )

        txn_identifier = charge_id or pi_id
        txn = PaymentTransaction.objects.filter(transaction_id=txn_identifier).first()

        if not txn:
            logger.warning(
                f"Webhook Refund Updated: No PaymentTransaction for identifier {txn_identifier}."
            )
            return

        metadata = txn.get_metadata()
        refunds_list = metadata.get("refunds", [])
        refund_entry = next(
            (r for r in refunds_list if r.get("refund_id_webhook") == refund_id), None
        )

        if not refund_entry:
            # This refund was not seen in refund.created, log it now.
            refund_entry = {
                "refund_id_webhook": refund_id,
                "type": "refund.updated_unseen_created",
            }
            refunds_list.append(refund_entry)
            logger.warning(
                f"Webhook Refund Updated: Refund {refund_id} (for Txn {txn.id}) was not previously logged via refund.created. Adding new entry."
            )

        refund_entry["status_webhook"] = refund_obj.status
        refund_entry["amount_webhook"] = decimal.Decimal(refund_obj.amount) / 100
        refund_entry["reason_webhook"] = refund_obj.reason
        if refund_obj.failure_reason:
            refund_entry["failure_reason_webhook"] = refund_obj.failure_reason

        metadata["refunds"] = refunds_list
        txn.set_metadata(metadata)
        txn.save()

        logger.info(
            f"Webhook Refund Updated: Updated refund {refund_id} details for Txn {txn.id}. Status: {refund_obj.status}"
        )

        # Update parent payment status, which will also look at order status
        # Pass the specific refund status to influence order's payment_status if needed
        desired_order_payment_status_override = None
        if refund_obj.status == "failed":
            desired_order_payment_status_override = "refund_failed"

        self.update_parent_payment_status(
            txn.parent_payment, desired_order_payment_status_override
        )

    def handle_dispute_created(self, dispute_obj):
        charge_id = dispute_obj.charge
        dispute_id = dispute_obj.id
        logger.info(
            f"Webhook Dispute Created: Dispute ID {dispute_id} for Charge {charge_id}"
        )

        txn = PaymentTransaction.objects.filter(transaction_id=charge_id).first()
        if not txn:
            logger.error(
                f"Webhook Dispute Created: No PaymentTransaction found for Charge {charge_id}"
            )
            return

        payment = txn.parent_payment
        metadata = txn.get_metadata()
        disputes_data = metadata.get("disputes", [])
        disputes_data.append(
            {
                "dispute_id": dispute_id,
                "amount": decimal.Decimal(dispute_obj.amount) / 100,
                "reason": dispute_obj.reason,
                "status": dispute_obj.status,  # e.g., 'warning_needs_response'
                "created_at_webhook": timezone.datetime.fromtimestamp(
                    dispute_obj.created
                ).isoformat(),
                "evidence_due_by": (
                    timezone.datetime.fromtimestamp(
                        dispute_obj.evidence_details.due_by
                    ).isoformat()
                    if dispute_obj.evidence_details.due_by
                    else None
                ),
                "is_livemode": dispute_obj.livemode,
            }
        )
        metadata["disputes"] = disputes_data
        txn.set_metadata(metadata)
        txn.save()  # Save metadata first

        # Update statuses
        payment.status = "disputed"
        payment.save()

        self.update_parent_payment_status(payment, "disputed")
        logger.info(
            f"Webhook: Payment {payment.id} and Order {payment.order.id} marked as disputed."
        )
        # TODO: Implement internal notification for dispute creation

    def handle_dispute_closed(self, dispute_obj):
        charge_id = dispute_obj.charge
        dispute_id = dispute_obj.id
        logger.info(
            f"Webhook Dispute Closed: Dispute ID {dispute_id} status {dispute_obj.status}"
        )  # e.g., 'won', 'lost'

        txn = PaymentTransaction.objects.filter(transaction_id=charge_id).first()
        if not txn:
            logger.error(
                f"Webhook Dispute Closed: No PaymentTransaction for Charge {charge_id}"
            )
            return

        payment = txn.parent_payment
        metadata = txn.get_metadata()
        disputes_data = metadata.get("disputes", [])
        dispute_entry = next(
            (d for d in disputes_data if d.get("dispute_id") == dispute_id), None
        )
        if dispute_entry:
            dispute_entry["status"] = dispute_obj.status
            dispute_entry["balance_transactions"] = [
                bt.id for bt in dispute_obj.balance_transactions
            ]  # Log related balance transactions
        else:  # Should not happen if created was handled
            disputes_data.append(
                {
                    "dispute_id": dispute_id,
                    "status": dispute_obj.status,
                    "note": "Closed event received without prior create.",
                }
            )
        metadata["disputes"] = disputes_data
        txn.set_metadata(metadata)
        txn.save()

        new_payment_status = payment.status
        new_order_payment_status = payment.order.payment_status

        if dispute_obj.status == "won":
            # If dispute is won, the payment might revert to 'completed' if no other issues.
            # The update_parent_payment_status will re-evaluate based on transactions.
            logger.info(f"Webhook: Dispute {dispute_id} won for charge {charge_id}.")
            # Let update_parent_payment_status determine the final state.
            # If funds were withdrawn and then returned, status might go from disputed -> completed.
            self.update_parent_payment_status(payment)
        elif dispute_obj.status == "lost":
            logger.info(f"Webhook: Dispute {dispute_id} lost for charge {charge_id}.")
            # If dispute is lost, funds are typically withdrawn.
            # The payment effectively becomes like a refunded or failed payment in terms of value.
            # update_parent_payment_status should also set the order status appropriately.
            # This might be complex if it was a partial dispute on a larger payment.
            # For simplicity, we might mark payment as 'failed' or keep 'disputed' and rely on financial reconciliation.
            # Let's set parent payment to 'failed' if the dispute is lost, assuming full amount.
            new_payment_status = "failed"  # Or a new status like "dispute_lost"
            new_order_payment_status = "failed"  # Or "dispute_lost"
            self.update_parent_payment_status(
                payment,
                new_order_payment_status,
                new_payment_status_override=new_payment_status,
            )

        logger.info(
            f"Webhook: Dispute {dispute_id} closed for Txn {txn.id}. Final Payment status: {payment.status}, Order payment status: {payment.order.payment_status}"
        )
        # TODO: Implement internal notification for dispute closure

    def handle_dispute_updated(self, dispute_obj):
        charge_id = dispute_obj.charge
        dispute_id = dispute_obj.id
        logger.info(
            f"Webhook Dispute Updated: Dispute ID {dispute_id} status {dispute_obj.status}"
        )

        txn = PaymentTransaction.objects.filter(transaction_id=charge_id).first()
        if not txn:
            logger.error(
                f"Webhook Dispute Updated: No PaymentTransaction for Charge {charge_id}"
            )
            return

        payment = txn.parent_payment
        metadata = txn.get_metadata()
        disputes_data = metadata.get("disputes", [])
        dispute_entry = next(
            (d for d in disputes_data if d.get("dispute_id") == dispute_id), None
        )
        if dispute_entry:
            dispute_entry["status"] = dispute_obj.status
            # update other relevant fields from dispute_obj if necessary
        else:
            disputes_data.append(
                {
                    "dispute_id": dispute_id,
                    "status": dispute_obj.status,
                    "note": "Updated event received without prior create/close.",
                }
            )
        metadata["disputes"] = disputes_data
        txn.set_metadata(metadata)
        txn.save()

        # Dispute updates might not always change the primary Payment/Order status directly,
        # but could be used for internal tracking or if specific statuses like 'funds_withdrawn' are critical.
        # For now, mostly logging and metadata update. Re-evaluate parent status.
        self.update_parent_payment_status(payment)
        logger.info(
            f"Webhook: Dispute {dispute_id} updated for Txn {txn.id}. Current Payment status: {payment.status}"
        )

    def handle_terminal_action_succeeded(self, reader_action):
        logger.info(
            f"Webhook Terminal Action Succeeded: Type {reader_action.type}, Status {reader_action.status}, ID {reader_action.id}"
        )
        # Example: reader_action.type could be 'terminal.reader.present_payment_method'
        # These events are often informational if the primary payment flow (PI succeeded/failed) is handled.
        # You might store these in specific logs or update metadata of a related payment attempt if you track terminal session IDs.
        # For now, this is primarily a logging placeholder.
        # If action was 'process_payment_intent' and it succeeded, it should also trigger a 'payment_intent.succeeded'
        payment_intent_id = reader_action.get("process_payment_intent", {}).get(
            "payment_intent"
        )  # Path might vary based on action
        if (
            not payment_intent_id and reader_action.action_type == "process_payment"
        ):  # Older event type
            payment_intent_id = reader_action.get("object", {}).get("payment_intent")

        if payment_intent_id:
            payment, txn, order = self._get_or_create_payment_and_transaction(
                payment_intent_id
            )
            if txn:
                metadata = txn.get_metadata()
                terminal_actions = metadata.get("terminal_actions", [])
                terminal_actions.append(
                    {
                        "action_id": reader_action.id,
                        "action_type": (
                            reader_action.type
                            if hasattr(reader_action, "type")
                            else reader_action.get("action_type")
                        ),  # Stripe SDK might give .type or .action_type
                        "status": reader_action.status,
                        "timestamp": timezone.now().isoformat(),
                        "event": "succeeded",
                    }
                )
                metadata["terminal_actions"] = terminal_actions
                txn.set_metadata(metadata)
                txn.save()
                logger.info(
                    f"Logged successful terminal action {reader_action.id} to metadata of Txn {txn.id}"
                )

    def handle_terminal_action_failed(self, reader_action):
        logger.info(
            f"Webhook Terminal Action Failed: Type {reader_action.type}, Status {reader_action.status}, ID {reader_action.id}"
        )
        failure_code = reader_action.failure_code
        failure_message = reader_action.failure_message
        logger.error(
            f"Terminal Action Failed: Code: {failure_code}, Message: {failure_message}"
        )

        payment_intent_id = reader_action.get("process_payment_intent", {}).get(
            "payment_intent"
        )
        if not payment_intent_id and reader_action.action_type == "process_payment":
            payment_intent_id = reader_action.get("object", {}).get("payment_intent")

        if payment_intent_id:
            payment, txn, order = self._get_or_create_payment_and_transaction(
                payment_intent_id
            )
            if txn:
                metadata = txn.get_metadata()
                terminal_actions = metadata.get("terminal_actions", [])
                terminal_actions.append(
                    {
                        "action_id": reader_action.id,
                        "action_type": (
                            reader_action.type
                            if hasattr(reader_action, "type")
                            else reader_action.get("action_type")
                        ),
                        "status": reader_action.status,
                        "failure_code": failure_code,
                        "failure_message": failure_message,
                        "timestamp": timezone.now().isoformat(),
                        "event": "failed",
                    }
                )
                metadata["terminal_actions"] = terminal_actions
                txn.set_metadata(metadata)
                # Potentially mark the transaction itself as failed if this terminal action was critical for it
                # and no other PI event (like payment_intent.failed) has done so.
                # if txn.status not in ["failed", "completed", "refunded"]:
                #     txn.status = "failed"
                #     logger.info(f"Marked Txn {txn.id} as failed due to terminal action failure.")
                txn.save()
                logger.info(
                    f"Logged failed terminal action {reader_action.id} to metadata of Txn {txn.id}"
                )
                if payment:  # Re-evaluate payment status
                    self.update_parent_payment_status(
                        payment, "failed" if txn.status == "failed" else None
                    )

    def update_parent_payment_status(
        self,
        payment,
        desired_order_payment_status=None,
        new_payment_status_override=None,
    ):
        """
        Helper to update parent Payment status based on its transactions.
        Also updates the related Order's payment_status.
        `desired_order_payment_status` can be used to directly set the order status for specific events.
        `new_payment_status_override` can forcefully set the Payment status.
        """
        if not payment:
            logger.warning(
                "update_parent_payment_status called with no payment object."
            )
            return

        order = payment.order
        original_payment_status = payment.status
        original_order_payment_status = order.payment_status

        if new_payment_status_override:
            payment.status = new_payment_status_override
        else:
            transactions = payment.transactions.all()
            if not transactions.exists():
                payment.status = "pending"
                logger.warning(
                    f"Payment {payment.id} has no transactions during status update."
                )
            else:
                num_total = transactions.count()
                num_completed = transactions.filter(status="completed").count()
                num_refunded = transactions.filter(status="refunded").count()
                num_failed = transactions.filter(status="failed").count()
                num_pending = transactions.filter(status="pending").count()
                num_canceled = transactions.filter(status="canceled").count()

                # Check for disputes at payment level as txn level doesn't have 'disputed' status
                # If any handler set payment.status to 'disputed', that takes precedence for now.
                if (
                    original_payment_status == "disputed"
                    and payment.status != "disputed"
                ):  # if override is not dispute
                    payment.status = "disputed"  # Maintain dispute status unless explicitly changed by dispute handler
                elif num_refunded == num_total and num_total > 0:
                    payment.status = "refunded"
                elif (
                    num_refunded > 0 and num_completed > 0
                ):  # Mix of completed and refunded
                    payment.status = "partially_refunded"
                elif (
                    num_refunded > 0
                ):  # Some refunds, no more completed (e.g. all were refunded)
                    payment.status = (
                        "refunded"  # If only refunds and others are e.g. pending/failed
                    )
                elif num_completed == num_total and num_total > 0:
                    payment.status = "completed"
                elif (
                    num_failed > 0
                    and (num_failed + num_canceled + num_refunded) == num_total
                ):  # All non-successful are failed or canceled
                    payment.status = "failed"
                elif (
                    num_canceled > 0
                    and (num_canceled + num_failed + num_refunded) == num_total
                ):
                    payment.status = "canceled"  # Or map to 'failed' for simplicity if 'canceled' payment means failure
                elif num_pending > 0:
                    payment.status = "pending"
                elif (
                    num_completed > 0
                ):  # Some completed, others might be pending/canceled but not all failed/refunded
                    payment.status = "pending"  # Or completed, depending on business rule for partial success
                else:  # Default fallback or if states are mixed in a way not covered above
                    payment.status = "pending"

        payment.save()

        # Determine and update Order's payment_status
        # Priority: Direct desired status > Mapping from Payment status > No change
        if desired_order_payment_status:
            order.payment_status = desired_order_payment_status
        else:
            # Map Payment status to Order payment_status
            if payment.status == "completed":
                order.payment_status = "paid"
            elif payment.status == "failed":
                order.payment_status = "failed"
            elif payment.status == "refunded":
                order.payment_status = "refunded"
            elif payment.status == "partially_refunded":
                order.payment_status = "partially_refunded"
            elif payment.status == "disputed":
                order.payment_status = "disputed"
            elif payment.status == "canceled":  # If a PI is canceled.
                order.payment_status = (
                    "canceled"  # Or 'failed' depending on desired customer visibility
                )
            elif payment.status == "voided":
                order.payment_status = "voided"
            elif payment.status == "pending":
                order.payment_status = "pending"
            # If a refund fails, the payment might still be 'completed' or 'partially_refunded'.
            # The 'refund_failed' status on Order needs to be set by the refund_updated handler specifically.
            # Let desired_order_payment_status handle 'refund_failed' explicitly.

        # Specific logic for marking cart as checked_out
        if payment.status == "completed" and order.payment_status == "paid":
            if order.source == "website":  # Check source before marking
                mark_cart_as_checked_out(order)

        if (
            order.payment_status != original_order_payment_status
            or payment.status != original_payment_status
        ):
            order.save()
            logger.info(
                f"Webhook: Updated parent Payment {payment.id} status to {payment.status} (was {original_payment_status}). "
                f"Order {order.id} payment_status to {order.payment_status} (was {original_order_payment_status})."
            )
        else:
            logger.info(
                f"Webhook: Parent Payment {payment.id} status {payment.status} and Order {order.id} payment_status {order.payment_status} remain unchanged."
            )


class ProcessPaymentView(APIView):
    authentication_classes = [WebsiteCookieJWTAuthentication]
    permission_classes = []  # AllowAny essentially

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        order_id = request.data.get("order_id")
        payment_method_id = request.data.get("payment_method_id")
        payment_intent_id = request.data.get(
            "payment_intent_id"
        )  # For confirming existing PI

        user_display = (
            f"User ID: {request.user.id}"
            if request.user and request.user.is_authenticated
            else "Guest User"
        )
        logger.info(
            f"ProcessPaymentView POST received for Order {order_id} by {user_display}. PM_ID: {payment_method_id}, PI_ID: {payment_intent_id}"
        )

        if not order_id:  # PM_ID or PI_ID can be null depending on flow
            logger.warning(f"ProcessPaymentView: Missing order_id ({order_id})")
            return Response(
                {"error": "Order ID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            order = get_object_or_404(Order, id=order_id)
            logger.info(
                f"ProcessPaymentView: Found Order {order_id}. Current payment status: {order.payment_status}"
            )

            payment, p_created = Payment.objects.update_or_create(
                order=order,
                defaults={
                    "amount": order.total_price,
                    "status": "pending",
                    "payment_method": "credit",
                },
            )
            action_word = "Created" if p_created else "Updated"
            logger.info(
                f"ProcessPaymentView: {action_word} Payment {payment.id} for Order {order_id}"
            )

            amount_cents = int(decimal.Decimal(order.total_price) * 100)
            MINIMUM_AMOUNT_CENTS = 50
            if amount_cents < MINIMUM_AMOUNT_CENTS:
                error_msg = f"The order total (${order.total_price:.2f}) is below the minimum required payment amount."
                logger.error(
                    f"ProcessPaymentView Error for Order {order_id}: Amount {amount_cents} cents is below minimum."
                )
                return Response(
                    {"error": {"message": error_msg, "code": "amount_too_small"}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            metadata = {"order_id": str(order.id)}
            customer_email = order.guest_email or (order.user and order.user.email)
            if customer_email:
                metadata["customer_email"] = customer_email

            stripe_pi_obj = None
            # Flow 1: Confirm an existing PaymentIntent (e.g., created by CreatePaymentIntentView)
            if (
                payment_intent_id and payment_method_id
            ):  # Client is providing PM to confirm an existing PI
                logger.info(
                    f"ProcessPaymentView: Confirming existing Stripe PI {payment_intent_id} with PM {payment_method_id} for Order {order_id}"
                )
                stripe_pi_obj = stripe.PaymentIntent.confirm(
                    payment_intent_id,
                    payment_method=payment_method_id,
                    # return_url=settings.STRIPE_REDIRECT_URL # if handling redirects
                    automatic_payment_methods={
                        "enabled": True,
                        "allow_redirects": "never",
                    },
                )
            # Flow 2: Create and Confirm a new PaymentIntent in one go
            elif payment_method_id:  # Client provides PM, create and confirm new PI
                logger.info(
                    f"ProcessPaymentView: Creating and Confirming new Stripe PI with PM {payment_method_id} for Order {order_id}"
                )
                stripe_pi_obj = stripe.PaymentIntent.create(
                    amount=amount_cents,
                    currency="usd",
                    payment_method=payment_method_id,
                    confirm=True,
                    automatic_payment_methods={
                        "enabled": True,
                        "allow_redirects": "never",
                    },
                    metadata=metadata,
                )
            else:  # Missing payment details
                logger.warning(
                    f"ProcessPaymentView: Missing payment_method_id and payment_intent_id for Order {order_id}"
                )
                return Response(
                    {"error": "Payment method ID or Payment Intent ID is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            logger.info(
                f"ProcessPaymentView: Stripe PI {stripe_pi_obj.id} status: {stripe_pi_obj.status}"
            )

            txn_status = "pending"
            order_payment_status_update = "pending"

            if stripe_pi_obj.status == "succeeded":
                txn_status = "completed"
                payment.status = "completed"
                order_payment_status_update = "paid"
            elif stripe_pi_obj.status in [
                "requires_payment_method",
                "requires_confirmation",
                "canceled",
            ]:
                txn_status = "failed"
                payment.status = "failed"
                order_payment_status_update = "failed"
            elif stripe_pi_obj.status == "requires_action":
                txn_status = (
                    "pending"  # Or a specific "requires_action" status if defined
                )
                # Payment status remains pending, order payment status pending

            # Always update order status if it's different, especially for success/failure
            if order.payment_status != order_payment_status_update:
                order.payment_status = order_payment_status_update
                order.save(update_fields=["payment_status"])

            charge_id = stripe_pi_obj.latest_charge
            effective_transaction_id = charge_id or stripe_pi_obj.id

            txn_metadata = {}
            try:
                # Use the PM from the PI object if available, else the one passed in request
                pm_id_to_retrieve = stripe_pi_obj.payment_method or payment_method_id
                if pm_id_to_retrieve:
                    pm = stripe.PaymentMethod.retrieve(pm_id_to_retrieve)
                    if pm.card:
                        txn_metadata["card_brand"] = pm.card.brand
                        txn_metadata["card_last4"] = pm.card.last4
            except Exception as pm_err:
                logger.warning(
                    f"ProcessPaymentView: Could not retrieve PM details: {pm_err}"
                )

            if stripe_pi_obj.last_payment_error:
                txn_metadata["failure_reason"] = (
                    stripe_pi_obj.last_payment_error.message
                )
                txn_metadata["failure_code"] = stripe_pi_obj.last_payment_error.code

            payment_txn, txn_created = PaymentTransaction.objects.update_or_create(
                parent_payment=payment,
                transaction_id=effective_transaction_id,  # Use effective ID
                defaults={
                    "payment_method": "credit",
                    "amount": decimal.Decimal(stripe_pi_obj.amount) / 100,
                    "status": txn_status,
                    "metadata_json": json.dumps(txn_metadata) if txn_metadata else None,
                },
            )
            txn_action_word = "Created" if txn_created else "Updated"
            logger.info(
                f"ProcessPaymentView: {txn_action_word} PaymentTransaction {payment_txn.id} with status {txn_status} for PI {stripe_pi_obj.id}"
            )

            payment.save()  # Save payment status
            if order.payment_status == "paid" and order.source == "website":
                mark_cart_as_checked_out(order)

            response_data = {
                "status": stripe_pi_obj.status,
                "payment_intent_id": stripe_pi_obj.id,
                "transaction_id": payment_txn.id,  # Our DB transaction ID
                "order_id": order.id,
                "order_payment_status": order.payment_status,
            }

            if stripe_pi_obj.status == "succeeded":
                logger.info(
                    f"ProcessPaymentView: Payment Succeeded for Order {order_id}, PI {stripe_pi_obj.id}"
                )
                response_data["success"] = True
                return Response(response_data)
            elif stripe_pi_obj.status == "requires_action":
                logger.warning(
                    f"ProcessPaymentView: Payment for Order {order_id} requires action (PI: {stripe_pi_obj.id})."
                )
                response_data["requires_action"] = True
                response_data["client_secret"] = stripe_pi_obj.client_secret
                return Response(response_data, status=status.HTTP_402_PAYMENT_REQUIRED)
            else:  # Failed states
                error_message = "Payment failed."
                if stripe_pi_obj.last_payment_error:
                    error_message = stripe_pi_obj.last_payment_error.message
                logger.error(
                    f"ProcessPaymentView: Payment Failed for Order {order_id}, PI {stripe_pi_obj.id}. Reason: {error_message}"
                )
                response_data["error"] = {
                    "message": error_message,
                    "code": "payment_failed",
                }
                return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        except stripe.error.CardError as e:
            err_msg = e.error.message if e.error else str(e)
            err_code = e.error.code if e.error else "card_error"
            logger.warning(
                f"ProcessPaymentView Stripe CardError for Order {order_id}: {err_msg} (Code: {err_code})",
                exc_info=True,
            )
            # Try to ensure failed status is recorded
            if "order" in locals() and order:  # Check if order was fetched
                payment, _ = Payment.objects.get_or_create(
                    order=order,
                    defaults={
                        "amount": order.total_price,
                        "status": "failed",
                        "payment_method": "credit",
                    },
                )
                if payment.status != "failed":
                    payment.status = "failed"
                    payment.save()
                if order.payment_status != "failed":
                    order.payment_status = "failed"
                    order.save()
                PaymentTransaction.objects.get_or_create(
                    parent_payment=payment,
                    transaction_id=f"card_error_{order_id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",  # Unique ID for error
                    defaults={
                        "payment_method": "credit",
                        "amount": order.total_price,
                        "status": "failed",
                        "metadata_json": json.dumps(
                            {
                                "error_message": err_msg,
                                "error_code": err_code,
                                "type": "card_error_direct",
                            }
                        ),
                    },
                )
            return Response(
                {"error": {"message": err_msg, "code": err_code, "type": "card_error"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except stripe.error.StripeError as e:
            err_msg = e.error.message if e.error else str(e)
            logger.error(
                f"ProcessPaymentView StripeError for Order {order_id}: {err_msg}",
                exc_info=True,
            )
            return Response(
                {
                    "error": {
                        "message": f"Payment processor error: {err_msg}",
                        "type": "api_error",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(
                f"ProcessPaymentView Error for Order {order_id}: {e}", exc_info=True
            )
            return Response(
                {
                    "error": {
                        "message": "An unexpected server error occurred.",
                        "type": "server_error",
                    }
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ConfirmPaymentView(APIView):
    permission_classes = [
        IsAuthenticated
    ]  # Should this be AllowAny if clientSecret is the key? Or IsAuthenticated for user orders?

    def post(self, request, *args, **kwargs):
        payment_intent_id = request.data.get("payment_intent_id")
        order_id = request.data.get("order_id")  # Optional: for cross-referencing

        if not payment_intent_id:
            return Response(
                {"error": "Payment Intent ID is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(
            f"ConfirmPaymentView received for PI: {payment_intent_id}, Order ID (context): {order_id}"
        )

        try:
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            logger.info(
                f"ConfirmPaymentView: Retrieved PI {payment_intent.id}, Status: {payment_intent.status}"
            )

            # Use the webhook's helper to find/create records consistently
            # This assumes that ProcessPaymentView or CreatePaymentIntentView has already run and created a PI with metadata.
            webhook_view_instance = (
                PaymentWebhookView()
            )  # Instantiate to use its helper
            payment, txn, order_obj = (
                webhook_view_instance._get_or_create_payment_and_transaction(
                    payment_intent_id=payment_intent.id,
                    charge_id=payment_intent.latest_charge,
                    amount_decimal=decimal.Decimal(payment_intent.amount) / 100,
                    payment_intent_obj=payment_intent,  # Pass the fetched PI object
                )
            )

            if not txn:
                # This case means _get_or_create_payment_and_transaction failed, likely due to missing order_id in PI metadata
                # or order not found. Error logged by helper.
                logger.error(
                    f"ConfirmPaymentView: Could not find/create transaction for PI {payment_intent_id}. Order ID in PI metadata: {payment_intent.metadata.get('order_id')}"
                )
                return Response(
                    {
                        "error": "Payment transaction not found or could not be established. Ensure order_id was in PaymentIntent metadata."
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            previous_txn_status = txn.status
            current_pi_status = payment_intent.status
            new_txn_status = txn.status  # Default to no change

            if current_pi_status == "succeeded":
                new_txn_status = "completed"
            elif current_pi_status in [
                "requires_payment_method",
                "requires_confirmation",
                "canceled",
            ]:
                new_txn_status = "failed"
            elif current_pi_status == "processing":
                new_txn_status = "pending"
            # else: if PI is 'requires_action', txn status likely remains 'pending' or its current state.

            if new_txn_status != previous_txn_status:
                txn.status = new_txn_status
                # If success, ensure charge_id is set as transaction_id
                if (
                    new_txn_status == "completed"
                    and payment_intent.latest_charge
                    and txn.transaction_id != payment_intent.latest_charge
                ):
                    logger.info(
                        f"ConfirmPaymentView: Updating Txn {txn.id} transaction_id from {txn.transaction_id} to Charge {payment_intent.latest_charge}"
                    )
                    txn.transaction_id = (
                        payment_intent.latest_charge
                    )  # Prefer charge ID

                # Update metadata like card details if this is the first time success is confirmed here
                if new_txn_status == "completed":
                    metadata = txn.get_metadata()
                    if (
                        not metadata.get("card_brand") and payment_intent.payment_method
                    ):  # Only if not already set
                        try:
                            pm = stripe.PaymentMethod.retrieve(
                                payment_intent.payment_method
                            )
                            if pm and pm.card:
                                metadata["card_brand"] = pm.card.brand
                                metadata["card_last4"] = pm.card.last4
                                txn.set_metadata(metadata)
                        except Exception as e:
                            logger.warning(
                                f"ConfirmPaymentView: Could not retrieve PM details for PI {payment_intent_id}: {e}"
                            )
                txn.save()
                logger.info(
                    f"ConfirmPaymentView: Updated Transaction {txn.id} status from {previous_txn_status} to {new_txn_status}"
                )

                # Determine desired order status based on PI status
                desired_order_status = None
                if current_pi_status == "succeeded":
                    desired_order_status = "paid"
                elif current_pi_status in [
                    "requires_payment_method",
                    "requires_confirmation",
                    "canceled",
                ]:
                    desired_order_status = "failed"

                webhook_view_instance.update_parent_payment_status(
                    payment, desired_order_status
                )
            else:
                logger.info(
                    f"ConfirmPaymentView: Transaction {txn.id} status already {new_txn_status}, PI status {current_pi_status}"
                )

            return Response(
                {
                    "status": current_pi_status,  # Stripe's PI status
                    "transaction_status": txn.status,  # Our DB transaction status
                    "payment_status": payment.status,  # Our DB parent payment status
                    "order_payment_status": (
                        order_obj.payment_status if order_obj else None
                    ),
                    "payment_intent_id": payment_intent_id,
                    "order_id": order_obj.id if order_obj else None,
                }
            )

        except (
            PaymentTransaction.DoesNotExist
        ):  # Should be caught by _get_or_create if txn_id was directly searched
            logger.error(
                f"ConfirmPaymentView Error: No PaymentTransaction found for PI {payment_intent_id} (direct lookup failed). This path should ideally not be hit if _get_or_create is robust."
            )
            return Response(
                {"error": "Payment transaction not found for the given ID"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except stripe.error.StripeError as e:
            logger.error(
                f"ConfirmPaymentView Stripe Error for PI {payment_intent_id}: {e}",
                exc_info=True,
            )
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(
                f"Error confirming payment for PI {payment_intent_id}: {e}",
                exc_info=True,
            )
            return Response(
                {"error": "An unexpected error occurred during payment confirmation"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PaymentListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]  # Or IsAdminUser
    serializer_class = PaymentSerializer

    def get_queryset(self):
        queryset = (
            Payment.objects.select_related("order")
            .prefetch_related("transactions")
            .order_by("-created_at")
        )
        # Add filters as needed by query_params (payment_method, status, order_id)
        # Example:
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        order_id_filter = self.request.query_params.get("order_id")
        if order_id_filter:
            queryset = queryset.filter(order_id=order_id_filter)
        return queryset


class PaymentDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]  # Or IsAdminUser
    serializer_class = PaymentSerializer
    queryset = Payment.objects.select_related("order").prefetch_related("transactions")
    lookup_url_kwarg = "payment_id"  # Ensure your URL conf uses 'payment_id'


class PaymentRefundView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @transaction.atomic
    def post(self, request, payment_id, *args, **kwargs):
        # payment_id here refers to OUR Payment model's PK.
        payment = get_object_or_404(
            Payment.objects.select_related("order"), id=payment_id
        )
        transaction_pk_to_refund = request.data.get(
            "transaction_id"
        )  # Expecting PaymentTransaction PK
        amount_str = request.data.get("amount")
        reason = request.data.get("reason", "requested_by_customer")

        if not transaction_pk_to_refund:
            return Response(
                {"error": "PaymentTransaction ID (transaction_id) is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not amount_str:
            return Response(
                {"error": "Refund amount is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            amount_to_refund = decimal.Decimal(amount_str)
            if amount_to_refund <= 0:
                raise ValueError("Amount must be positive")
        except (decimal.InvalidOperation, ValueError):
            return Response(
                {"error": "Invalid or non-positive refund amount format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            txn_to_refund = get_object_or_404(
                PaymentTransaction, pk=transaction_pk_to_refund, parent_payment=payment
            )
        except (
            PaymentTransaction.DoesNotExist,
            ValueError,
        ):  # ValueError for invalid PK format
            return Response(
                {
                    "error": f"Transaction with ID {transaction_pk_to_refund} not found for this payment or invalid ID."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if txn_to_refund.status == "refunded":
            return Response(
                {"error": f"Transaction {txn_to_refund.id} already fully refunded."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if txn_to_refund.status != "completed":
            return Response(
                {
                    "error": f"Cannot refund transaction {txn_to_refund.id} (status: {txn_to_refund.status}). Must be 'completed'."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check for partial refunds - sum of existing refunds for this txn vs txn amount
        metadata = txn_to_refund.get_metadata()
        existing_refunds_total = sum(
            decimal.Decimal(r.get("amount_webhook", 0))
            for r in metadata.get("refunds", [])
            if r.get("status_webhook") == "succeeded"
        )
        refundable_amount = txn_to_refund.amount - existing_refunds_total
        if amount_to_refund > refundable_amount:
            return Response(
                {
                    "error": f"Refund amount ({amount_to_refund}) exceeds remaining refundable amount ({refundable_amount}). Already refunded: {existing_refunds_total}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        refund_details_dict = {
            "original_transaction_pk": txn_to_refund.pk,
            "original_stripe_id": txn_to_refund.transaction_id,  # This is Stripe's Charge ID or PI ID
            "method": txn_to_refund.payment_method,
            "requested_amount": amount_to_refund,
            "status": "pending_api_call",  # Initial status before Stripe call
            "success": False,
            "refund_id_stripe": None,  # Stripe's refund object ID
        }

        try:
            if txn_to_refund.payment_method == "credit":
                stripe_charge_or_pi_id = txn_to_refund.transaction_id
                if not stripe_charge_or_pi_id:
                    return Response(
                        {
                            "error": "Missing Stripe transaction ID for this credit transaction."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                amount_in_cents = int(
                    amount_to_refund.quantize(decimal.Decimal("0.01")) * 100
                )
                refund_params = {"amount": amount_in_cents, "reason": reason}

                # Determine if it's a charge or payment_intent
                if stripe_charge_or_pi_id.startswith("pi_"):
                    refund_params["payment_intent"] = stripe_charge_or_pi_id
                elif stripe_charge_or_pi_id.startswith(
                    "py_"
                ):  # Legacy Payment object for Stripe Terminal
                    # Refunds for 'py_' objects are typically done via 'charge' if a charge was created.
                    # This might need more specific handling if you use older Stripe Terminal integrations.
                    # For now, assume it's either pi_ or ch_ (orichg_)
                    logger.warning(
                        f"Attempting refund for legacy Stripe Payment object {stripe_charge_or_pi_id}. This might need 'charge' parameter."
                    )
                    # Attempt with charge, Stripe will error if incorrect.
                    # In modern integrations, a PI is usually associated.
                    # If 'py_' is the ONLY ID you have and it's not directly refundable, this will fail.
                    # It's best if your 'transaction_id' for completed payments is always a 'ch_' or 'pi_'.
                    # The 'latest_charge' from a PI is the 'ch_'.
                    refund_params["charge"] = stripe_charge_or_pi_id
                else:  # Assume it's a charge ID (ch_, src_, etc.)
                    refund_params["charge"] = stripe_charge_or_pi_id

                logger.info(f"Attempting Stripe refund with params: {refund_params}")
                stripe_refund_obj = stripe.Refund.create(**refund_params)

                logger.info(
                    f"Stripe Refund call response: Refund ID {stripe_refund_obj.id}, Status {stripe_refund_obj.status}"
                )
                refund_details_dict.update(
                    {
                        "refund_id_stripe": stripe_refund_obj.id,
                        "status": stripe_refund_obj.status,  # e.g. succeeded, pending, requires_action, failed
                        "processed_amount": decimal.Decimal(stripe_refund_obj.amount)
                        / 100,
                        "success": stripe_refund_obj.status
                        == "succeeded",  # Or "pending" if async
                    }
                )
                if stripe_refund_obj.failure_reason:
                    refund_details_dict["failure_reason"] = (
                        stripe_refund_obj.failure_reason
                    )

            elif txn_to_refund.payment_method == "cash":
                logger.info(
                    f"Processing cash refund for Txn PK: {txn_to_refund.id}, Amount: {amount_to_refund}"
                )
                refund_details_dict.update(
                    {
                        "status": "succeeded",
                        "processed_amount": amount_to_refund,
                        "success": True,
                    }
                )
                # Cash drawer logic can be added here if needed, using ReceiptPrinterController
                # try:
                #     ReceiptPrinterController().open_cash_drawer()
                # except Exception as e:
                #     logger.error(f"Failed to open cash drawer during cash refund: {e}")
            else:
                return Response(
                    {
                        "error": f"Refund not supported for method {txn_to_refund.payment_method}."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Update transaction metadata with this refund attempt
            refunds_list = metadata.get("refunds", [])
            refunds_list.append(refund_details_dict)
            metadata["refunds"] = refunds_list
            txn_to_refund.set_metadata(metadata)

            # Update transaction status if fully refunded by this action or previous ones + this one
            new_total_refunded = existing_refunds_total + (
                refund_details_dict.get("processed_amount", 0)
                if refund_details_dict.get("success")
                else 0
            )
            if new_total_refunded >= txn_to_refund.amount:
                txn_to_refund.status = "refunded"

            txn_to_refund.save()
            logger.info(
                f"Updated PaymentTransaction {txn_to_refund.id}. New total refunded: {new_total_refunded}. Status: {txn_to_refund.status}"
            )

            # Update parent Payment and Order status
            # Instantiate webhook view to use its more comprehensive status updater
            webhook_view_instance = PaymentWebhookView()
            webhook_view_instance.update_parent_payment_status(payment)

            return Response(
                {
                    "success": refund_details_dict.get("success", False),
                    "message": f"Refund of {formatCurrency(refund_details_dict.get('processed_amount', amount_to_refund))} for transaction {txn_to_refund.id} is {refund_details_dict.get('status')}.",
                    "refund_details": refund_details_dict,
                    "payment_status": payment.status,  # Reflects updated parent status
                    "transaction_status": txn_to_refund.status,  # Reflects updated txn status
                }
            )

        except stripe.error.StripeError as e:
            logger.error(
                f"Stripe Error during refund for Txn {txn_to_refund.id}: {str(e)}",
                exc_info=True,
            )
            refund_details_dict["status"] = "failed_stripe_error"
            refund_details_dict["error_message"] = str(e)
            # Update metadata even on failure
            metadata = txn_to_refund.get_metadata()
            refunds_list = metadata.get("refunds", [])
            refunds_list.append(refund_details_dict)
            metadata["refunds"] = refunds_list
            txn_to_refund.set_metadata(metadata)
            txn_to_refund.save()
            return Response(
                {
                    "error": f"Stripe Error: {str(e)}",
                    "refund_details": refund_details_dict,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(
                f"Error processing refund for Txn {txn_to_refund.id}: {str(e)}",
                exc_info=True,
            )
            return Response(
                {"error": f"Failed to process refund: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return str(obj)
        return super().default(obj)  # Fixed super call


def formatCurrency(amount):
    try:
        dec_amount = decimal.Decimal(
            str(amount)
        )  # Ensure it's string first for Decimal
        return f"${dec_amount:.2f}"
    except (decimal.InvalidOperation, TypeError, ValueError):
        return "$?.??"


# Ensure all views that update parent payment status (like ConfirmPaymentView if it has its own helper)
# are also updated or centralized to use the PaymentWebhookView's more comprehensive helper.
# For ConfirmPaymentView, I've modified it to instantiate and use PaymentWebhookView._get_or_create_payment_and_transaction
# and PaymentWebhookView.update_parent_payment_status.
