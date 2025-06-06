# backend/orders/views_guest.py

import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404  # Needed for GuestOrderDetailView
from django.db import transaction  # Import transaction
from decimal import Decimal

# Import necessary models and serializers
from .models import Cart, Order, OrderItem, CartItem  # Import CartItem
from .serializers_website import CartSerializer, WebsiteOrderSerializer
from payments.models import Payment  # Import Payment model

logger = logging.getLogger(__name__)


# --- View for Fetching Active Guest Cart ---
class GuestCartView(APIView):
    """
    Retrieve the cart details for a guest user using their guest_id cookie.
    Handles GET requests to fetch the current guest cart.
    """

    permission_classes = []  # Allow anyone (guests) to access this endpoint

    def get(self, request, *args, **kwargs):
        """Get the current guest cart contents based on the guest_id cookie."""
        guest_id = request.COOKIES.get("guest_id")

        # If no guest_id cookie is present, return an empty cart structure.
        if not guest_id:
            logger.info(
                "GuestCartView: No guest_id cookie found. Returning empty cart structure."
            )
            return Response(
                {
                    "id": None,
                    "items": [],
                    "total_price": 0.0,
                    "item_count": 0,
                    "created_at": None,
                    "updated_at": None,
                },
                status=status.HTTP_200_OK,
            )

        try:
            # Find the active cart (not checked out) for this guest_id.
            cart = (
                Cart.objects.filter(guest_id=guest_id, checked_out=False)
                .prefetch_related("items__product")
                .first()
            )  # Use prefetch_related

            if cart:
                logger.info(
                    f"GuestCartView: Found active cart (ID: {cart.id}) for guest_id: {guest_id[:6]}..."
                )
                # Serialize the cart data. Pass request context for absolute image URLs.
                serializer = CartSerializer(cart, context={"request": request})
                return Response(serializer.data)
            else:
                # If no active cart matches the guest_id, return the empty structure.
                logger.info(
                    f"GuestCartView: No active cart found for guest_id: {guest_id[:6]}... Returning empty cart structure."
                )
                return Response(
                    {
                        "id": None,
                        "items": [],
                        "total_price": 0.0,
                        "item_count": 0,
                        "created_at": None,
                        "updated_at": None,
                    },
                    status=status.HTTP_200_OK,
                )

        except Exception as e:
            logger.error(
                f"GuestCartView: Error fetching cart for guest_id {guest_id[:6]}...: {e}",
                exc_info=True,
            )
            return Response(
                {"error": "An error occurred while fetching the guest cart."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# --- View for Looking Up Completed Guest Orders ---
class GuestOrderDetailView(APIView):
    """
    Get details of a completed order for guest users using guest_id, email, and order_id.
    Handles POST requests for lookup.
    """

    permission_classes = []  # Allow guests

    def post(self, request, *args, **kwargs):
        """Look up a guest order using details from the request body."""
        guest_id = request.COOKIES.get(
            "guest_id"
        )  # Use cookie as primary guest identifier
        email = request.data.get("email")
        order_id = request.data.get("order_id")

        # Validate required information
        if not all([guest_id, email, order_id]):
            missing = [
                field
                for field, value in {
                    "guest_id (cookie)": guest_id,
                    "email": email,
                    "order_id": order_id,
                }.items()
                if not value
            ]
            logger.warning(
                f"GuestOrderDetailView: Lookup failed. Missing required information: {', '.join(missing)}"
            )
            return Response(
                {"error": f"Missing required information: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Query using all three pieces of information for security
            order = Order.objects.get(
                id=order_id,
                guest_id=guest_id,
                guest_email__iexact=email,  # Case-insensitive email match
                source="website",  # Ensure it's a website order
            )
            # Pass request context for absolute image URLs
            serializer = WebsiteOrderSerializer(order, context={"request": request})
            logger.info(
                f"GuestOrderDetailView: Successfully found order {order_id} for guest."
            )
            return Response(serializer.data)
        except Order.DoesNotExist:
            logger.warning(
                f"GuestOrderDetailView: Order not found for ID: {order_id}, Email: {email}, GuestId: {guest_id[:6]}..."
            )
            return Response(
                {"error": "Order not found or details do not match."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.error(
                f"GuestOrderDetailView: Error fetching order {order_id} for guest: {e}",
                exc_info=True,
            )
            return Response(
                {"error": "An error occurred while fetching the order details."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GuestCheckoutView(APIView):
    permission_classes = []

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        guest_id = request.COOKIES.get("guest_id")
        if not guest_id:
            logger.warning("GuestCheckoutView: No guest_id cookie found.")
            return Response(
                {
                    "error": "Guest session not found. Please add items to your cart again."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            cart = (
                Cart.objects.select_related(None)
                .prefetch_related("items__product")
                .get(guest_id=guest_id, checked_out=False)
            )
        except Cart.DoesNotExist:
            logger.warning(
                f"GuestCheckoutView: No active cart found for guest_id: {guest_id[:6]}..."
            )
            return Response(
                {"error": "Your cart is empty or could not be found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not cart.items.exists():
            logger.warning(
                f"GuestCheckoutView: Cart (ID: {cart.id}) for guest_id {guest_id[:6]}... is empty."
            )
            return Response(
                {"error": "Your cart is empty."}, status=status.HTTP_400_BAD_REQUEST
            )

        first_name = request.data.get("first_name")
        last_name = request.data.get("last_name")
        email = request.data.get("email")
        phone = request.data.get("phone")
        notes = request.data.get("notes", "")  # Added notes

        surcharge_percentage_str = request.data.get("surcharge_percentage")
        surcharge_percentage = (
            Decimal(surcharge_percentage_str)
            if surcharge_percentage_str
            else Decimal("0.00")
        )

        payment_method_from_request = request.data.get("payment_method", "card").lower()
        if payment_method_from_request not in ["card", "credit"]:
            logger.warning(
                f"GuestCheckoutView: Invalid payment_method '{payment_method_from_request}'. Website orders are card only."
            )
            return Response(
                {
                    "error": "Invalid payment method. Online orders must be paid by card."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        actual_payment_method_for_db = "credit"

        required_fields = {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "phone": phone,
        }
        missing_fields = [name for name, value in required_fields.items() if not value]
        if missing_fields:
            logger.warning(
                f"GuestCheckoutView: Missing fields for guest checkout: {', '.join(missing_fields)}"
            )
            return Response(
                {"error": f'Missing required fields: {", ".join(missing_fields)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            order_creation_payload = {
                "user": None,
                "guest_id": guest_id,
                "guest_first_name": first_name,
                "guest_last_name": last_name,
                "guest_email": email,
                "guest_phone": phone,
                "status": "pending",
                "payment_status": "pending",
                "source": "website",
                "total_price": Decimal("0.00"),  # Will be recalculated
                "surcharge_percentage": surcharge_percentage,  # Add surcharge percentage
                # "notes": notes, # If you have a notes field on the Order model
            }
            order = Order.objects.create(**order_creation_payload)

            order_items = []
            for cart_item in cart.items.all():
                order_items.append(
                    OrderItem(
                        order=order,
                        product=cart_item.product,
                        quantity=cart_item.quantity,
                        unit_price=cart_item.product.price,
                    )
                )
            OrderItem.objects.bulk_create(order_items)
            logger.info(
                f"GuestCheckoutView: Copied {len(order_items)} items from Cart (ID: {cart.id}) to Order (ID: {order.id})."
            )

            # Recalculate total price which now includes surcharge logic in the model
            final_price = order.calculate_total_price(
                save_instance=True
            )  # save_instance is True by default
            logger.info(
                f"GuestCheckoutView: Calculated final price for Order (ID: {order.id}): {final_price}"
            )

            Payment.objects.create(
                order=order,
                amount=final_price,
                payment_method=actual_payment_method_for_db,
                status="pending",
            )

            cart.checked_out = True
            cart.save(update_fields=["checked_out"])
            serializer = WebsiteOrderSerializer(order, context={"request": request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(
                f"GuestCheckoutView: Error during checkout: {e}", exc_info=True
            )
            return Response(
                {"error": "An unexpected error occurred during guest checkout."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
