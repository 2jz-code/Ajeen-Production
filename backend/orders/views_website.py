# orders/views_website.py

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny  # <--- IMPORT AllowAny
from django.shortcuts import get_object_or_404
from django.utils.crypto import get_random_string

from .models import Order, OrderItem, Cart, CartItem
from .serializers_website import (
    WebsiteOrderSerializer,
    CartSerializer,
    CartItemSerializer,
)
from products.models import Product
from users.permissions import IsWebsiteUser
import logging
from django.db import transaction  # Import transaction

logger = logging.getLogger(__name__)  # Add logger


class WebsiteCartView(APIView):
    """
    Handle cart operations for website users
    """

    permission_classes = [AllowAny]  # <--- ADD THIS LINE

    def get_cart(self, request):
        """Helper method to get or create a cart for a user or guest"""
        guest_id = None

        if request.user.is_authenticated and request.user.is_website_user:
            cart, created = Cart.objects.get_or_create(
                user=request.user, checked_out=False
            )
        else:
            # For guest users
            guest_id = request.COOKIES.get("guest_id")
            if not guest_id:
                guest_id = get_random_string(32)

            cart, created = Cart.objects.get_or_create(
                guest_id=guest_id, checked_out=False
            )
            # Only return the guest_id if it was newly created
            guest_id = (
                guest_id if created or not request.COOKIES.get("guest_id") else None
            )

        return cart, guest_id

    def get(self, request):
        """Get the current cart contents"""
        cart, guest_id = self.get_cart(request)

        # Pass request in the context to the serializer
        serializer = CartSerializer(cart, context={"request": request})

        response = Response(serializer.data)

        # Set guest ID cookie if needed
        if guest_id:
            response.set_cookie(
                "guest_id",
                guest_id,
                max_age=60 * 60 * 24 * 30,  # 30 days
                httponly=True,
                samesite="Lax",
            )

        return response

    def post(self, request):
        """Add an item to the cart"""
        cart, guest_id = self.get_cart(request)

        # Validate request data
        product_id = request.data.get("product_id")
        quantity = int(request.data.get("quantity", 1))

        if not product_id:
            return Response(
                {"error": "Product ID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        if quantity <= 0:
            return Response(
                {"error": "Quantity must be positive"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the product
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Use the serializer to create/update cart item
        serializer = CartItemSerializer(
            data={"product_id": product_id, "quantity": quantity}
        )

        if serializer.is_valid():
            serializer.save(cart=cart)

            # Get updated cart - include request context
            cart_serializer = CartSerializer(cart, context={"request": request})

            # Prepare response
            response = Response(cart_serializer.data, status=status.HTTP_201_CREATED)

            # Set guest ID cookie if needed
            if guest_id:
                response.set_cookie(
                    "guest_id",
                    guest_id,
                    max_age=60 * 60 * 24 * 30,  # 30 days
                    httponly=True,
                    samesite="Lax",
                )

            return response

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WebsiteCartItemView(APIView):
    """
    Handle operations on individual cart items for website users
    """

    permission_classes = [AllowAny]  # <--- ADD THIS LINE

    def get_cart(self, request):
        """Helper method to get a cart for a user or guest"""
        if request.user.is_authenticated and request.user.is_website_user:
            cart, _ = Cart.objects.get_or_create(user=request.user, checked_out=False)
            return cart

        guest_id = request.COOKIES.get("guest_id")
        if not guest_id:
            return None

        cart, _ = Cart.objects.get_or_create(guest_id=guest_id, checked_out=False)
        return cart

    def put(self, request, item_id):
        """Update the quantity of a cart item"""
        cart = self.get_cart(request)

        if not cart:
            return Response(
                {"error": "No active cart found"}, status=status.HTTP_404_NOT_FOUND
            )

        try:
            cart_item = CartItem.objects.get(id=item_id, cart=cart)
        except CartItem.DoesNotExist:
            return Response(
                {"error": "Cart item not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = CartItemSerializer(
            cart_item,
            data={
                "product_id": cart_item.product.id,
                "quantity": request.data.get("quantity", 1),
            },
            partial=True,
        )

        if serializer.is_valid():
            serializer.save()

            # Return updated cart with request context
            cart_serializer = CartSerializer(cart, context={"request": request})
            return Response(cart_serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, item_id):
        """Remove an item from the cart"""
        cart = self.get_cart(request)

        if not cart:
            return Response(
                {"error": "No active cart found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Find and delete the cart item
        try:
            cart_item = CartItem.objects.get(id=item_id, cart=cart)
            cart_item.delete()

            # Return updated cart with request context
            cart_serializer = CartSerializer(cart, context={"request": request})
            return Response(cart_serializer.data)
        except CartItem.DoesNotExist:
            return Response(
                {"error": "Cart item not found"}, status=status.HTTP_404_NOT_FOUND
            )


class WebsiteCheckoutView(APIView):
    permission_classes = []

    @transaction.atomic  # Add transaction.atomic
    def post(self, request):
        user = (
            request.user
            if request.user.is_authenticated
            and hasattr(request.user, "is_website_user")
            and request.user.is_website_user
            else None
        )
        cart = None
        guest_id = None
        guest_data_for_order = {}

        if user:
            cart = Cart.objects.filter(user=user, checked_out=False).first()
        else:
            guest_id = request.COOKIES.get("guest_id")
            if not guest_id:
                return Response(
                    {"error": "No cart found. Guest session missing."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            cart = Cart.objects.filter(guest_id=guest_id, checked_out=False).first()

        if not cart or not cart.items.exists():
            return Response(
                {"error": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce 'card' payment
        payment_method_from_request = request.data.get("payment_method", "card").lower()
        if payment_method_from_request not in ["card", "credit"]:
            logger.warning(
                f"WebsiteCheckoutView: Invalid payment_method '{payment_method_from_request}'. Website orders are card only."
            )
            return Response(
                {
                    "error": "Invalid payment method. Online orders must be paid by card."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        actual_payment_method_for_db = "credit"

        if not user:  # Guest checkout specific data
            guest_data_for_order = {
                "guest_id": guest_id,
                "guest_first_name": request.data.get("first_name", ""),
                "guest_last_name": request.data.get("last_name", ""),
                "guest_email": request.data.get("email", ""),
                "guest_phone": request.data.get("phone", ""),  # Get phone for guest
            }
            required_guest_fields = [
                "guest_first_name",
                "guest_last_name",
                "guest_email",
                "guest_phone",
            ]
            if not all(guest_data_for_order.get(f) for f in required_guest_fields):
                missing = [
                    f for f in required_guest_fields if not guest_data_for_order.get(f)
                ]
                return Response(
                    {"error": f"Guest information required: {', '.join(missing)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        order_creation_payload = {
            "user": user,
            "status": "pending",
            "source": "website",
            "payment_status": "pending",
            **guest_data_for_order,  # Spreads guest info if guest, otherwise empty
        }

        # If authenticated user, try to get phone from their profile if not provided in guest_data
        if user and not guest_data_for_order.get(
            "guest_phone"
        ):  # Should not happen if user is not None
            # Assuming your CustomUser model has a 'phone_number' field
            if hasattr(user, "phone_number") and user.phone_number:
                order_creation_payload["guest_phone"] = (
                    user.phone_number
                )  # Store it in guest_phone for consistency or have a dedicated order.phone
            # else: # Optionally make phone required for authenticated users too if not on profile
            #    return Response({"error": "Phone number required for authenticated user."}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.create(**order_creation_payload)
        # ... (OrderItem creation logic from cart items) ...
        for item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                unit_price=item.product.price,
            )
        order.calculate_total_price()  # This also saves the order

        from payments.models import Payment

        Payment.objects.create(
            order=order,
            payment_method=actual_payment_method_for_db,  # 'credit'
            amount=order.total_price,
            status="pending",
        )

        cart.checked_out = True
        cart.save()

        serializer = WebsiteOrderSerializer(order, context={"request": request})
        response_data = serializer.data
        response_data["order_id"] = order.id
        return Response(response_data, status=status.HTTP_201_CREATED)


class WebsiteOrderListView(APIView):
    """
    List orders for website users
    """

    permission_classes = [IsAuthenticated, IsWebsiteUser]

    def get(self, request):
        orders = Order.objects.filter(user=request.user, source="website").order_by(
            "-created_at"
        )

        serializer = WebsiteOrderSerializer(orders, many=True)
        return Response(serializer.data)


class WebsiteOrderDetailView(APIView):
    """
    Get details of a specific order for website users
    """

    permission_classes = [IsAuthenticated, IsWebsiteUser]

    def get(self, request, order_id=None):
        # If order_id is in the URL, use it
        if order_id:
            try:
                order = Order.objects.get(
                    id=order_id, user=request.user, source="website"
                )
                serializer = WebsiteOrderSerializer(order, context={"request": request})
                return Response(serializer.data)
            except Order.DoesNotExist:
                return Response(
                    {"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND
                )

        # If no order_id is provided, return the most recent order
        try:
            order = (
                Order.objects.filter(user=request.user, source="website")
                .order_by("-created_at")
                .first()
            )

            if not order:
                return Response(
                    {"error": "No orders found"}, status=status.HTTP_404_NOT_FOUND
                )

            serializer = WebsiteOrderSerializer(order, context={"request": request})
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ReorderView(APIView):
    """
    API endpoint to reorder a past order
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")

        if not order_id:
            return Response(
                {"error": "Order ID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Get the original order
            original_order = Order.objects.get(id=order_id, user=request.user)

            # Clear current cart
            Cart.objects.filter(user=request.user, checked_out=False).delete()

            # Create new cart
            new_cart = Cart.objects.create(user=request.user, checked_out=False)

            # Add items from original order to the new cart
            for item in original_order.items.all():
                CartItem.objects.create(
                    cart=new_cart, product=item.product, quantity=item.quantity
                )

            return Response(
                {
                    "success": True,
                    "message": "Items added to cart",
                    "cart_id": new_cart.id,
                }
            )

        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found or you do not have permission to access it"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to reorder: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
