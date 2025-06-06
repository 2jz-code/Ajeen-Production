# combined-project/backend/orders/views.py

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.http import Http404

# Updated imports: Import PaymentTransaction
from payments.models import Payment, PaymentTransaction
from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderListSerializer
from products.models import Product
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction  # Import transaction
import json
import decimal  # Import decimal
from django.http import JsonResponse
from rest_framework.pagination import PageNumberPagination
from discounts.models import Discount
from decimal import Decimal
from django.db.models import F
from hardware.controllers.receipt_printer import ReceiptPrinterController
import logging

logger = logging.getLogger(__name__)


class OrderPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


# ✅ List Orders (Now Updates Instead of Duplicating)
class OrderList(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = OrderPagination

    def get_serializer_class(self):
        """Use different serializers for list and detail views"""
        if self.request.method == "GET":
            return OrderListSerializer
        return OrderSerializer

    def get_queryset(self):
        """
        Get optimized queryset with proper prefetching to reduce database queries
        """
        # Start with base queryset
        # Added payment__transactions to prefetch related transactions
        queryset = (
            Order.objects.select_related("user", "payment", "discount")
            .prefetch_related("items__product", "payment__transactions")
            .order_by("-created_at")
        )

        # Apply filters
        source = self.request.query_params.get("source")
        status_param = self.request.query_params.get("status")

        if source:
            queryset = queryset.filter(source=source)

        if status_param and status_param != "all":
            queryset = queryset.filter(status=status_param)

        return queryset

    def list(self, request, *args, **kwargs):
        """
        Override list method to add metadata about orders
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        """
        If an 'in_progress' order exists, mark it as 'saved' instead of creating a new one.
        """
        user = request.user
        existing_order = Order.objects.filter(user=user, status="in_progress").first()

        if existing_order:
            existing_order.status = "saved"
            existing_order.save()
            return Response(
                OrderSerializer(existing_order).data, status=status.HTTP_200_OK
            )

        # If no in-progress order exists, create a new saved order
        data = request.data
        order = Order.objects.create(user=user, status="saved")

        for item in data.get("items", []):
            product = get_object_or_404(Product, id=item["product_id"])
            # Ensure unit_price is stored
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=item["quantity"],
                unit_price=product.price,
            )

        order.calculate_total_price()
        order.save()  # Save order to get ID before creating payment
        # Ensure payment is created for saved orders too
        Payment.objects.get_or_create(
            order=order, defaults={"status": "pending", "amount": order.total_price}
        )
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


# ✅ Get, Update, or Delete an Order (Now Supports "in_progress")
class OrderDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        """
        Updates an order's status or items.
        - If the order is 'in_progress', it updates cart contents.
        - If changing status (e.g., 'in_progress' → 'saved' or 'completed'), it updates accordingly.
        """
        order = self.get_object()
        data = request.data

        # ✅ Only clear & update items if new items are provided
        if "items" in data:
            with transaction.atomic():  # Wrap item update in transaction
                order.items.all().delete()  # Clear existing items

                for item_data in data["items"]:
                    product = get_object_or_404(Product, id=item_data["id"])
                    # Ensure unit_price is stored when updating items
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=item_data["quantity"],
                        unit_price=product.price,  # Store current price
                    )

        # ✅ Update status if provided (e.g., 'saved', 'completed')
        if "status" in data:
            order.status = data["status"]

        order.calculate_total_price()
        order.save()

        # Update payment amount if it exists
        try:
            payment = Payment.objects.get(order=order)
            payment.amount = order.total_price
            payment.save()
        except Payment.DoesNotExist:
            # If payment doesn't exist yet, create it (e.g., if order moved from saved to in_progress)
            if order.status == "in_progress":
                Payment.objects.create(
                    order=order, status="pending", amount=order.total_price
                )

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


# ✅ Start Order (Ensures Only One In-Progress Order)
class StartOrder(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """
        Starts a new 'in_progress' order without checking for existing ones.
        Also creates an associated Payment record.
        """
        user = request.user
        new_order = Order.objects.create(user=user, status="in_progress")
        # Create payment record immediately
        Payment.objects.create(
            order=new_order, status="pending", amount=decimal.Decimal("0.00")
        )  # Initialize payment with 0 amount
        return Response(OrderSerializer(new_order).data, status=status.HTTP_201_CREATED)


# ✅ Auto-Save "In-Progress" Order
class UpdateInProgressOrder(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        user = request.user
        order_id_from_request = request.data.get("order_id")  # Renamed for clarity

        logger.debug(
            f"UpdateInProgressOrder: User={user} (ID: {user.id if user else 'None'}), Order ID from request={order_id_from_request} (Type: {type(order_id_from_request)})"
        )

        if not order_id_from_request:
            logger.warning(
                "UpdateInProgressOrder: Order ID is required but not provided."
            )
            return Response(
                {"error": "Order ID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Preliminary check (optional, but good for deeper debugging if needed)
            # order_for_debug = Order.objects.get(id=order_id_from_request)
            # logger.debug(f"Order ID {order_id_from_request} exists. User: {order_for_debug.user}, Status: '{order_for_debug.status}'")
            # if order_for_debug.user != user:
            #     logger.warning(f"User mismatch! DB Order User: {order_for_debug.user.id}, Request User: {user.id}")
            # if order_for_debug.status != "in_progress":
            #     logger.warning(f"Status mismatch! DB Order Status: '{order_for_debug.status}', Expected: 'in_progress'")
            # pass # End of optional preliminary check

            order = get_object_or_404(
                Order.objects.select_related(
                    "payment", "user"
                ),  # Added "user" to select_related
                id=order_id_from_request,
                user=user,
                status="in_progress",
            )
            logger.info(
                f"Order {order.id} found for user {user.username} with status 'in_progress'."
            )

        except Http404:  # Correctly catch Http404 raised by get_object_or_404
            logger.warning(
                f"get_object_or_404 failed for order_id={order_id_from_request}, user={user.username} (ID: {user.id}), status='in_progress'. "
                f"This usually means the order doesn't exist, doesn't belong to this user, or isn't 'in_progress'."
            )
            return Response(
                {"error": "In-progress order not found or does not belong to user"},
                status=status.HTTP_404_NOT_FOUND,
            )
        # Removed the redundant Order.DoesNotExist as get_object_or_404 handles it by raising Http404

        with transaction.atomic():
            logger.debug(
                f"Order {order.id}: Items BEFORE delete: {order.items.count()}"
            )

            # Ensure 'items' is the correct related_name. Based on your model, it is.
            order.items.all().delete()

            # To be absolutely sure deletion happened before re-adding,
            # you can re-fetch the count from the DB.
            items_after_delete_count = OrderItem.objects.filter(order=order).count()
            logger.debug(
                f"Order {order.id}: Items AFTER delete (queried DB): {items_after_delete_count}"
            )

            if items_after_delete_count > 0:
                logger.error(
                    f"CRITICAL: Order {order.id}: Items were NOT deleted properly before re-adding! Count: {items_after_delete_count}"
                )
                # This would be a significant issue if it occurs.

            items_in_payload = request.data.get("items", [])
            logger.debug(
                f"Order {order.id}: Payload to add contains {len(items_in_payload)} items."
            )

            items_added_count = 0
            for item_data in items_in_payload:
                try:
                    product_id = item_data.get("id") or item_data.get("product_id")
                    quantity = item_data.get("quantity")

                    if not product_id:
                        logger.warning(
                            f"Order {order.id}: Skipping item due to missing product_id: {item_data}"
                        )
                        continue
                    if quantity is None:  # Check for None explicitly for quantity
                        logger.warning(
                            f"Order {order.id}: Skipping item {product_id} due to missing quantity: {item_data}"
                        )
                        continue

                    # Ensure quantity is a positive integer
                    try:
                        quantity = int(quantity)
                        if quantity <= 0:
                            logger.warning(
                                f"Order {order.id}: Skipping item {product_id} due to invalid quantity ({quantity})."
                            )
                            continue
                    except ValueError:
                        logger.warning(
                            f"Order {order.id}: Skipping item {product_id} due to non-integer quantity ('{item_data.get('quantity')}')."
                        )
                        continue

                    product = Product.objects.get(
                        id=product_id
                    )  # Use .get() to raise Product.DoesNotExist if not found

                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=quantity,
                        unit_price=product.price,  # Storing price at time of order
                    )
                    items_added_count += 1
                except Product.DoesNotExist:
                    logger.warning(
                        f"Order {order.id}: Product ID {product_id} not found during cart update. Skipping item."
                    )
                except KeyError as e:  # Catch specific KeyError for missing 'quantity'
                    logger.warning(
                        f"Order {order.id}: Missing key '{e}' in item_data for product_id {product_id if 'product_id' in locals() else 'unknown'}. Item data: {item_data}. Skipping item."
                    )
                except (
                    Exception
                ) as e:  # Catch any other unexpected error during item creation
                    logger.error(
                        f"Order {order.id}: Unexpected error creating OrderItem for product_id {product_id if 'product_id' in locals() else 'unknown'}: {str(e)}. Item data: {item_data}"
                    )

            logger.debug(
                f"Order {order.id}: Items actually ADDED in this request: {items_added_count}"
            )
            logger.debug(
                f"Order {order.id}: Items count via order.items.count() AFTER add loop: {order.items.count()}"
            )
            # Forcing a refresh from DB to get the most accurate count for items just created in the loop
            db_items_count_after_add = OrderItem.objects.filter(order=order).count()
            logger.debug(
                f"Order {order.id}: Items count by querying DB AFTER add loop: {db_items_count_after_add}"
            )

            order.calculate_total_price(
                save_instance=False
            )  # Calculate but don't save yet, main save is next
            order.save()  # Saves total_price, discount_amount, tip_amount, and any other direct field changes
            logger.info(f"Order {order.id} totals recalculated and order saved.")

            payment = getattr(order, "payment", None)
            if payment:
                payment.amount = order.total_price
                payment.save()
                logger.debug(
                    f"Order {order.id}: Associated payment {payment.id} amount updated."
                )
            else:
                new_payment = Payment.objects.create(
                    order=order, status="pending", amount=order.total_price
                )
                logger.info(
                    f"Order {order.id}: New payment {new_payment.id} created as none existed."
                )

        serialized_order = OrderSerializer(order).data
        logger.info(
            f"Order {order.id} successfully auto-saved for user {user.username}."
        )
        return Response({"message": "Order auto-saved", "order": serialized_order})


# ✅ Resume a Saved Order
class ResumeOrder(APIView):
    permission_classes = [
        IsAuthenticated
    ]  # Or a more specific permission like IsStaffUser

    def post(self, request, pk, *args, **kwargs):
        allowed_statuses_to_resume = ["saved", "in_progress"]
        current_user = request.user

        try:
            # Step 1: Fetch the order by pk, without filtering by the current user yet.
            # We prefetch related items for efficiency, as in your original code.
            order_to_resume = get_object_or_404(
                Order.objects.select_related("payment", "user").prefetch_related(
                    "items__product"
                ),
                id=pk,
                status__in=allowed_statuses_to_resume,  # Order must be in a resumable state
            )
        except Http404:  # Catch Http404 specifically if get_object_or_404 fails
            return Response(
                {"error": "Order not found or is not in a resumable state."},
                status=status.HTTP_404_NOT_FOUND,
            )

        original_user = order_to_resume.user

        # Step 2: Re-assign the order to the current user if they are different.
        # Also, log this action for auditing if necessary.
        if original_user != current_user:
            print(
                f"[AUDIT] User '{current_user.username}' (ID: {current_user.id}) "
                f"is resuming/taking over order '{order_to_resume.id}' "
                f"previously associated with user '{original_user.username if original_user else 'Unassigned'}' "
                f"(ID: {original_user.id if original_user else 'N/A'})."
            )
            order_to_resume.user = current_user
            # Any other logic for takeover can go here (e.g., logging, notifications)

        # Step 3: Ensure the order status is 'in_progress' for the current user.
        order_to_resume.status = "in_progress"
        order_to_resume.save()  # This will save the user and status updates.

        # Step 4: Handle the payment record (same as your existing logic).
        # This ensures a payment record is associated and in 'pending' state.
        payment, created = Payment.objects.get_or_create(
            order=order_to_resume,
            defaults={"status": "pending", "amount": order_to_resume.total_price},
        )
        if (
            payment.status != "pending"
        ):  # Ensure payment status is pending when resuming
            payment.status = "pending"
            # If the order total might have changed due to re-calculation logic elsewhere,
            # you might also want to update payment.amount here.
            # For now, assuming total_price on order is up-to-date or will be handled by cart sync.
            # payment.amount = order_to_resume.total_price
            payment.save(update_fields=["status"])

        # Step 5: Serialize and return the order data.
        # The frontend will use this to populate the cartStore.
        serialized_order = OrderSerializer(order_to_resume).data
        return Response(serialized_order, status=status.HTTP_200_OK)


# ✅ Get Latest In-Progress Order (Auto-Resume on Reload)
class GetInProgressOrder(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """
        Fetch the last in-progress order for auto-resume.
        """
        user = request.user
        order = (
            Order.objects.filter(user=user, status="in_progress")
            .order_by("-created_at")
            .first()
        )

        if order:
            # Ensure payment exists
            Payment.objects.get_or_create(
                order=order, defaults={"status": "pending", "amount": order.total_price}
            )
            return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

        return Response(
            {"message": "No active order found"}, status=status.HTTP_404_NOT_FOUND
        )


class CompleteOrder(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk, *args, **kwargs):
        try:
            print(f"--- Completing Order {pk} ---")
            request_data = request.data
            print(
                "Request Body RAW:", json.dumps(request_data)
            )  # Log request data for MVP

            order = get_object_or_404(
                Order.objects.select_related("discount", "payment"),
                id=pk,
                user=request.user,
            )

            if order.status == "completed":
                print(f"Order {pk} is already completed. Returning success.")
                return Response(
                    {
                        "status": "success",
                        "message": "Order is already completed",
                        "order": OrderSerializer(order).data,
                    },
                    status=status.HTTP_200_OK,
                )

            if order.status != "in_progress":
                print(
                    f"Error: Order {pk} has status '{order.status}' and cannot be completed."
                )
                return Response(
                    {
                        "status": "error",
                        "message": f"Order cannot be completed from status '{order.status}'",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            print(
                f"Order {pk} found and is 'in_progress'. Proceeding with MVP completion."
            )

            # --- MVP: Directly use frontend values ---
            frontend_values = {}
            try:
                # Values from frontend for direct storage
                order.subtotal_from_frontend = Decimal(
                    request_data.get("subtotal", "0.00")
                )
                order.tax_amount_from_frontend = Decimal(
                    request_data.get("tax_amount", "0.00")
                )
                order.surcharge_amount = Decimal(
                    request_data.get("surcharge_amount", "0.00")
                )
                # surcharge_percentage might also be sent if it's used for display or record
                order.surcharge_percentage = Decimal(
                    request_data.get(
                        "surcharge_percentage", order.surcharge_percentage or "0.0000"
                    )
                )
                order.tip_amount = Decimal(request_data.get("tip_amount", "0.00"))
                order.total_price = Decimal(
                    request_data.get("total_amount", "0.00")
                )  # grand_total from frontend
                order.discount_amount = Decimal(
                    request_data.get("discount_amount", "0.00")
                )  # if frontend calculates this

                frontend_values = {
                    "subtotal": order.subtotal_from_frontend,
                    "tax_amount": order.tax_amount_from_frontend,
                    "surcharge_amount": order.surcharge_amount,
                    "surcharge_percentage": order.surcharge_percentage,
                    "tip_amount": order.tip_amount,
                    "total_price": order.total_price,
                    "discount_amount": order.discount_amount,
                }
                print(f"Order {pk}: Frontend values to be stored: {frontend_values}")

            except (TypeError, decimal.InvalidOperation) as e:
                logger.error(
                    f"Error parsing decimal values from frontend for order {pk}: {e}. Data: {request_data}"
                )
                return Response(
                    {
                        "status": "error",
                        "message": f"Invalid data format for financial values: {e}",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Update order status
            order.status = "completed"
            order.payment_status = (
                "paid"  # Assume paid if this endpoint is hit successfully
            )

            # Handle discount linkage if discount_id is sent
            discount_id = request_data.get("discount_id")
            if discount_id:
                try:
                    discount = Discount.objects.get(id=discount_id, is_active=True)
                    order.discount = discount
                    # discount.used_count = F("used_count") + 1 # This can still be done
                    # discount.save(update_fields=["used_count"])
                    print(f"Applied discount {discount_id} by ID.")
                except Discount.DoesNotExist:
                    print(
                        f"Warning: Discount ID {discount_id} not found or inactive. Storing discount_amount from frontend only."
                    )
                    order.discount = (
                        None  # Ensure no discount is linked if ID is invalid
                    )
            else:
                order.discount = None
                # order.discount_amount is already set from frontend_values

            # Save the order with frontend-provided values
            # The calculate_total_price method is NOT explicitly called here to recalculate.
            # We are trusting the frontend_values for the final amounts.
            fields_to_update = [
                "status",
                "payment_status",
                "subtotal_from_frontend",
                "tax_amount_from_frontend",
                "surcharge_amount",
                "surcharge_percentage",
                "tip_amount",
                "total_price",
                "discount_amount",
                "discount",
            ]
            order.save(update_fields=fields_to_update)
            print(f"Order {pk} fields updated and saved with frontend values.")

            # Payment record handling (ensure payment amount matches final total_price)
            payment_details_data = request_data.get("payment_details", {})
            payment_method_str = payment_details_data.get("paymentMethod", "other")[:50]
            payment, created = Payment.objects.update_or_create(
                order=order,
                defaults={
                    "status": "completed",  # Assuming payment is completed
                    "amount": order.total_price,  # Use the frontend-provided total_price
                    "payment_method": payment_method_str,
                    "is_split_payment": payment_details_data.get("splitPayment", False)
                    or (len(payment_details_data.get("transactions", [])) > 1),
                },
            )
            action_word = "Created" if created else "Updated"
            print(
                f"{action_word} Payment {payment.id} for Order {pk}. Amount: {payment.amount}"
            )

            # Create PaymentTransaction records (this logic can remain largely the same)
            transactions_data = payment_details_data.get("transactions", [])
            if isinstance(transactions_data, list) and transactions_data:
                # ... (rest of your transaction processing logic - ensure it uses amounts from payload)
                # This part assumes transactions_data contains amounts that sum up to order.total_price
                # You might want to add a server-side check here for MVP if total of transactions matches order.total_price
                total_paid_in_transactions = Decimal(0)
                payment.transactions.all().delete()
                print(
                    f"Cleared existing transactions for Payment {payment.id} before adding new ones."
                )

                for txn_data in transactions_data:
                    method = txn_data.get("method", "other").lower()[:50]
                    amount_str = str(txn_data.get("amount", "0"))
                    try:
                        amount = Decimal(amount_str)
                        if amount <= 0:
                            print(
                                f"Warning: Skipping transaction with zero/negative amount: {amount_str}"
                            )
                            continue
                    except decimal.InvalidOperation:
                        print(
                            f"Warning: Invalid amount '{amount_str}' in transaction data. Skipping."
                        )
                        continue

                    total_paid_in_transactions += amount
                    # ... (rest of metadata and PaymentTransaction creation)
                    metadata = {}  # Populate as before
                    card_info = txn_data.get("cardInfo", {})
                    flow_data = txn_data.get("flowData", {})
                    payment_in_flow = (
                        flow_data.get("payment", {})
                        if isinstance(flow_data.get("payment"), dict)
                        else {}
                    )

                    if method == "credit":
                        metadata["card_brand"] = card_info.get(
                            "brand"
                        ) or payment_in_flow.get("cardInfo", {}).get("brand")
                        metadata["card_last4"] = card_info.get(
                            "last4"
                        ) or payment_in_flow.get("cardInfo", {}).get("last4")
                        metadata["stripe_payment_status"] = payment_in_flow.get(
                            "status"
                        )
                        metadata["stripe_payment_timestamp"] = payment_in_flow.get(
                            "timestamp"
                        )
                    elif method == "cash":
                        metadata["cashTendered"] = txn_data.get("cashTendered")
                        metadata["change"] = txn_data.get("change")

                    external_txn_id = (
                        txn_data.get("transactionId")
                        or txn_data.get("transaction_id")
                        or payment_in_flow.get("transactionId")
                        or payment_in_flow.get("transaction_id")
                    )

                    payment_txn = PaymentTransaction.objects.create(
                        parent_payment=payment,
                        payment_method=method,
                        amount=amount,
                        status="completed",  # Assuming transaction is completed
                        transaction_id=external_txn_id,
                        metadata_json=(
                            json.dumps(metadata, cls=DecimalEncoder)
                            if metadata
                            else None
                        ),
                    )
                    print(
                        f"Created PaymentTransaction {payment_txn.id}: Method={method}, Amount={amount}"
                    )

                if abs(total_paid_in_transactions - order.total_price) > Decimal(
                    "0.01"
                ):
                    logger.warning(
                        f"Order {pk}: Discrepancy! Frontend total ({order.total_price}) != Sum of payment_details transactions ({total_paid_in_transactions})."
                    )
                else:
                    print(
                        f"Order {pk}: Amounts match: Order Total={order.total_price}, Transactions Sum={total_paid_in_transactions}"
                    )
            else:
                print(
                    "No detailed transaction data in payment_details, skipping PaymentTransaction creation."
                )

            order.refresh_from_db()
            print(f"Order {pk} completion process (MVP style) finished successfully.")
            return Response(
                {
                    "status": "success",
                    "message": "Order completed successfully (MVP)",
                    "order": OrderSerializer(order).data,
                }
            )

        except Discount.DoesNotExist:  # Keep this for discount ID validation
            print(
                f"Error: Invalid Discount ID provided during completion of order {pk}."
            )
            return Response(
                {"status": "error", "message": "Invalid Discount ID provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            import traceback

            print(f"--- Error Completing Order {pk} (MVP) ---")
            traceback.print_exc()
            return Response(
                {
                    "status": "error",
                    "message": f"An internal error occurred during order completion: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# Helper for JSON serialization of Decimal
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            # Keep precision, return as string
            return str(obj)
        # Let the base class default method raise the TypeError
        return json.JSONEncoder.default(self, obj)


class UpdateOrderStatus(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        """
        Update an order's status and conditionally void the related payment.
        """
        # --- MODIFICATION: Use select_related to fetch payment efficiently ---
        order = get_object_or_404(Order.objects.select_related("payment"), id=pk)
        # --- END MODIFICATION ---

        # Check if the status is valid for the order source
        new_status = request.data.get("status")

        if not new_status:
            return Response(
                {"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Validate status transitions
        valid_statuses_for_source = []
        if order.source == "website":
            # Website orders cannot be 'voided' according to this logic
            valid_statuses_for_source = [
                "pending",
                "preparing",  # Assuming 'preparing' is a valid status
                "completed",
                "cancelled",
            ]
        else:  # POS order
            # POS orders can be 'voided'
            valid_statuses_for_source = ["saved", "in_progress", "completed", "voided"]

        if new_status not in valid_statuses_for_source:
            return Response(
                {
                    "error": f"Invalid status '{new_status}' for {order.source} order. Must be one of: {', '.join(valid_statuses_for_source)}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update the order status
        order.status = new_status
        order.save()

        # --- ADDED LOGIC: Update payment status if order is voided ---
        if new_status == "voided":
            try:
                # Access the related payment via the OneToOneField relationship
                payment = order.payment
                payment.status = "voided"
                payment.payment_method = "other"
                # Use update_fields to be specific and potentially avoid triggering other signals
                payment.save(update_fields=["status", "payment_method"])
                print(
                    f"Payment {payment.id} status updated to voided for voided Order {order.id}"
                )  # Optional: for logging/debugging
            except Payment.DoesNotExist:
                # This case *shouldn't* happen if POS orders always have a payment created,
                # but it's good practice to handle it.
                print(
                    f"Warning: Payment record not found for Order {order.id} when voiding."
                )
            except AttributeError:
                # Handle case where the 'payment' relation might not be loaded correctly (less likely with select_related)
                print(
                    f"Error: Could not access payment attribute for Order {order.id} when voiding."
                )
            except Exception as e:
                # Log any other unexpected errors during payment update
                print(
                    f"Error updating payment status to voided for Order {order.id}: {e}"
                )
        # --- END ADDED LOGIC ---

        return Response(OrderSerializer(order).data)


class ApplyOrderDiscount(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        """Apply a discount to an order"""
        try:
            # Ensure order is in a state where discount can be applied (e.g., in_progress)
            order = get_object_or_404(
                Order.objects.select_related("payment"),
                id=pk,
                user=request.user,
                status="in_progress",
            )
            discount_id = request.data.get("discount_id")

            if not discount_id:
                return Response(
                    {"error": "discount_id is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                discount = Discount.objects.get(id=discount_id, is_active=True)
            except Discount.DoesNotExist:
                return Response(
                    {"error": "Discount not found or inactive"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Check if discount is valid for the order items/amount
            subtotal = sum(
                item.unit_price * item.quantity for item in order.items.all()
            )
            if not discount.is_valid(
                subtotal
            ):  # Pass order amount for validation checks
                return Response(
                    {"error": "Discount is not applicable to this order"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Apply the discount and recalculate total
            order.discount = discount
            order.calculate_total_price()  # This calculates and sets discount_amount and total_price
            order.save()

            # Update associated payment amount
            payment = getattr(order, "payment", None)  # Use getattr for safe access
            if payment:
                payment.amount = order.total_price
                payment.save()
            else:
                # Create payment if it doesn't exist
                Payment.objects.create(
                    order=order, status="pending", amount=order.total_price
                )

            return Response(OrderSerializer(order).data)

        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @transaction.atomic
    def delete(self, request, pk):
        """Remove a discount from an order"""
        try:
            order = get_object_or_404(
                Order.objects.select_related("payment"),
                id=pk,
                user=request.user,
                status="in_progress",
            )

            # Check if there's a discount to remove
            if not order.discount:
                return Response(
                    {"message": "No discount applied to this order"},
                    status=status.HTTP_200_OK,
                )

            # Remove the discount and recalculate
            order.discount = None
            order.discount_amount = 0
            order.calculate_total_price()  # Recalculate without discount
            order.save()

            # Update associated payment amount
            payment = getattr(order, "payment", None)
            if payment:
                payment.amount = order.total_price
                payment.save()
            else:
                Payment.objects.create(
                    order=order, status="pending", amount=order.total_price
                )

            return Response(OrderSerializer(order).data)

        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ReprintReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        try:
            order = get_object_or_404(
                Order.objects.select_related("payment", "discount").prefetch_related(
                    "items__product", "payment__transactions"
                ),
                id=pk,
                status="completed",
            )
            logger.info(f"Reprint request received for completed Order ID: {pk}")
            serialized_order = OrderSerializer(order).data
            receipt_data_for_print = {
                "id": serialized_order.get("id"),
                "timestamp": serialized_order.get("created_at"),
                "customer_name": serialized_order.get("created_by"),
                "items": [
                    {
                        "product_name": item.get("product", {}).get(
                            "name", "Unknown Item"
                        ),
                        "quantity": item.get("quantity"),
                        "unit_price": item.get("product", {}).get("price", 0.00),
                    }
                    for item in serialized_order.get("items", [])
                ],
                "subtotal": None,
                "tax": None,
                "total_amount": serialized_order.get("total_price"),
                "payment": {
                    "method": serialized_order.get("payment", {}).get("payment_method"),
                    "amount_tendered": None,
                    "change": None,
                    "transactions": serialized_order.get("payment", {}).get(
                        "transactions", []
                    ),
                    "is_split_payment": serialized_order.get("payment", {}).get(
                        "is_split_payment"
                    ),
                },
                "open_drawer": False,
            }
            try:
                printer_controller = ReceiptPrinterController()
                print_result = printer_controller.print_transaction_receipt(
                    receipt_data_for_print
                )  # Keep original call for now, modify controller
                if print_result.get("status") == "success":
                    logger.info(f"Successfully sent reprint request for Order ID: {pk}")
                    return Response(
                        {"message": "Receipt reprint initiated successfully."},
                        status=status.HTTP_200_OK,
                    )
                else:
                    logger.error(
                        f"Reprint failed for Order ID: {pk}. Reason: {print_result.get('message')}"
                    )
                    return Response(
                        {
                            "error": f"Failed to initiate reprint: {print_result.get('message')}"
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
            except Exception as printer_err:
                logger.error(
                    f"Error initializing or using printer controller for Order ID {pk}: {printer_err}",
                    exc_info=True,
                )
                return Response(
                    {"error": "Printer service unavailable."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
        except Order.DoesNotExist:
            logger.warning(f"Reprint failed: Completed Order ID {pk} not found.")
            return Response(
                {"error": "Completed order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.error(
                f"Unexpected error during reprint for Order ID {pk}: {e}", exc_info=True
            )
            return Response(
                {"error": "An unexpected error occurred."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
