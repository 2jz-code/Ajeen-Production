# orders/views_website.py

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.utils.crypto import get_random_string
from django.db import transaction
from decimal import Decimal, InvalidOperation as DecimalInvalidOperation

from .models import Order, OrderItem, Cart, CartItem
from .serializers_website import (
    WebsiteOrderSerializer,
    CartSerializer,
    CartItemSerializer,
)
from products.models import Product
from users.permissions import IsWebsiteUser  # Assuming this is correctly defined
from payments.models import Payment
import logging

logger = logging.getLogger(__name__)


class WebsiteCartView(APIView):
    permission_classes = [AllowAny]

    def get_cart(self, request):
        guest_id = None
        if (
            request.user.is_authenticated
            and hasattr(request.user, "is_website_user")
            and request.user.is_website_user
        ):  # Check attribute
            cart, created = Cart.objects.get_or_create(
                user=request.user, checked_out=False
            )
        else:
            guest_id = request.COOKIES.get("guest_id")
            if not guest_id:
                guest_id = get_random_string(32)
            cart, created = Cart.objects.get_or_create(
                guest_id=guest_id, checked_out=False
            )
            guest_id = (
                guest_id if created or not request.COOKIES.get("guest_id") else None
            )
        return cart, guest_id

    def get(self, request):
        cart, guest_id = self.get_cart(request)
        serializer = CartSerializer(cart, context={"request": request})
        response = Response(serializer.data)
        if guest_id:
            response.set_cookie(
                "guest_id",
                guest_id,
                max_age=60 * 60 * 24 * 30,
                httponly=True,
                samesite="Lax",
            )
        return response

    def post(self, request):
        cart, guest_id = self.get_cart(request)
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
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Use CartItemSerializer's create method which handles existing items
        cart_item_data = {
            "product_id": product.id,
            "quantity": quantity,
            "cart": cart.id,
        }

        # Check if item already exists in cart for this product
        existing_item = CartItem.objects.filter(cart=cart, product=product).first()
        if existing_item:
            existing_item.quantity += quantity
            existing_item.save()
            item_serializer = CartItemSerializer(
                existing_item, context={"request": request}
            )
        else:
            item_serializer = CartItemSerializer(
                data={"product_id": product.id, "quantity": quantity},
                context={"request": request},
            )
            if item_serializer.is_valid():
                item_serializer.save(cart=cart)  # Pass cart object here
            else:
                return Response(
                    item_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                )

        cart_serializer = CartSerializer(
            cart, context={"request": request}
        )  # Re-serialize the whole cart
        response = Response(cart_serializer.data, status=status.HTTP_201_CREATED)
        if guest_id:
            response.set_cookie(
                "guest_id",
                guest_id,
                max_age=60 * 60 * 24 * 30,
                httponly=True,
                samesite="Lax",
            )
        return response


class WebsiteCartItemView(APIView):
    permission_classes = [AllowAny]

    def get_cart(self, request):
        if (
            request.user.is_authenticated
            and hasattr(request.user, "is_website_user")
            and request.user.is_website_user
        ):
            cart, _ = Cart.objects.get_or_create(user=request.user, checked_out=False)
            return cart
        guest_id = request.COOKIES.get("guest_id")
        if not guest_id:
            return None
        cart, _ = Cart.objects.get_or_create(guest_id=guest_id, checked_out=False)
        return cart

    def put(self, request, item_id):
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

        new_quantity = request.data.get("quantity")
        if new_quantity is None or int(new_quantity) <= 0:
            # If quantity is zero or less, effectively delete the item
            cart_item.delete()
            cart_serializer = CartSerializer(cart, context={"request": request})
            return Response(cart_serializer.data)

        serializer = CartItemSerializer(
            cart_item,
            data={"quantity": new_quantity},
            partial=True,
            context={"request": request},
        )
        if serializer.is_valid():
            serializer.save()
            cart_serializer = CartSerializer(cart, context={"request": request})
            return Response(cart_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, item_id):
        cart = self.get_cart(request)
        if not cart:
            return Response(
                {"error": "No active cart found"}, status=status.HTTP_404_NOT_FOUND
            )
        try:
            cart_item = CartItem.objects.get(id=item_id, cart=cart)
            cart_item.delete()
            cart_serializer = CartSerializer(cart, context={"request": request})
            return Response(cart_serializer.data)
        except CartItem.DoesNotExist:
            return Response(
                {"error": "Cart item not found"}, status=status.HTTP_404_NOT_FOUND
            )


class WebsiteCheckoutView(APIView):
    permission_classes = [AllowAny]  # Allows guests too

    @transaction.atomic
    def post(self, request):  # Handles new order creation before payment
        logger.info(f"POST /website/checkout/ - Received request.data: {request.data}")
        user = request.user if request.user.is_authenticated else None
        cart = None

        if user:
            cart = Cart.objects.filter(user=user, checked_out=False).first()
        else:
            guest_id = request.COOKIES.get("guest_id")
            if guest_id:
                cart = Cart.objects.filter(guest_id=guest_id, checked_out=False).first()
            else:
                return Response(
                    {"error": "No guest session found for cart."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if not cart or not cart.items.exists():
            return Response(
                {"error": "Cart is empty or not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            frontend_financial_data = {
                "subtotal": Decimal(request.data.get("subtotal", "0.00")),
                "tax_amount": Decimal(request.data.get("tax_amount", "0.00")),
                "surcharge_amount": Decimal(
                    request.data.get("surcharge_amount", "0.00")
                ),
                "surcharge_percentage": Decimal(
                    request.data.get("surcharge_percentage", "0.0000")
                ),
                "tip_amount": Decimal(request.data.get("tip_amount", "0.00")),
                "discount_amount": Decimal(request.data.get("discount_amount", "0.00")),
                "total_price": Decimal(request.data.get("total_amount", "0.00")),
            }
        except DecimalInvalidOperation:
            logger.error(
                f"Invalid decimal format in POST checkout data: {request.data}"
            )
            return Response(
                {"error": "Invalid number format for financial data."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order_creation_payload = {
            "user": user,
            "status": "pending",
            "source": "website",
            "payment_status": "pending",
            "guest_first_name": request.data.get(
                "first_name", getattr(user, "first_name", "") if user else ""
            ),
            "guest_last_name": request.data.get(
                "last_name", getattr(user, "last_name", "") if user else ""
            ),
            "guest_email": request.data.get(
                "email", getattr(user, "email", "") if user else ""
            ),
            "guest_phone": request.data.get("phone"),
        }
        if not user:
            order_creation_payload["guest_id"] = cart.guest_id

        if not order_creation_payload["guest_phone"]:
            return Response(
                {"error": "Phone number is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not user and not order_creation_payload["guest_email"]:
            return Response(
                {"error": "Email is required for guest checkout."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = Order(**order_creation_payload)
        order.calculate_total_price(
            save_instance=False, frontend_values=frontend_financial_data
        )
        order.save()
        logger.info(f"Order {order.id} created (POST) with total: {order.total_price}")

        OrderItem.objects.filter(
            order=order
        ).delete()  # Clear any previous items if re-POSTing to same order (unlikely with current FE)
        order_items_to_create = []
        for item in cart.items.all():
            order_items_to_create.append(
                OrderItem(
                    order=order,
                    product=item.product,
                    quantity=item.quantity,
                    unit_price=item.product.price,
                )
            )
        OrderItem.objects.bulk_create(order_items_to_create)

        payment, _ = Payment.objects.update_or_create(
            order=order,
            defaults={
                "payment_method": "credit",
                "amount": order.total_price,
                "status": "pending",
            },
        )
        logger.info(
            f"Payment record {payment.id} for order {order.id} ensured with amount {order.total_price}."
        )

        serializer = WebsiteOrderSerializer(order, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def put(self, request):  # Handles updates to an existing pending order
        logger.info(f"PUT /website/checkout/ - Received request.data: {request.data}")
        order_id = request.data.get(
            "order_id"
        )  # Expect order_id in the payload for PUT
        if not order_id:
            return Response(
                {"error": "Order ID is required for an update."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user if request.user.is_authenticated else None

        try:
            if user:
                order_to_update = Order.objects.get(
                    id=order_id, user=user, status="pending", payment_status="pending"
                )
            else:  # Guest
                guest_id_from_cookie = request.COOKIES.get("guest_id")
                if not guest_id_from_cookie:
                    return Response(
                        {"error": "Guest session not found for order update."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                order_to_update = Order.objects.get(
                    id=order_id,
                    guest_id=guest_id_from_cookie,
                    status="pending",
                    payment_status="pending",
                )
        except Order.DoesNotExist:
            logger.warning(
                f"Order {order_id} not found for update or not in updatable state."
            )
            return Response(
                {"error": "Order not found or cannot be updated."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Fetch the current cart for this user/guest
        cart = None
        if user:
            cart = Cart.objects.filter(user=user, checked_out=False).first()
        elif order_to_update.guest_id:  # Use guest_id from the order being updated
            cart = Cart.objects.filter(
                guest_id=order_to_update.guest_id, checked_out=False
            ).first()

        if not cart or not cart.items.exists():
            # This case implies cart was emptied after order initiated.
            # Depending on desired behavior, you might error out or update order to be empty.
            # For now, let's assume if they are updating, the cart should reflect what they intend to order.
            logger.warning(
                f"Cart for order update (Order ID: {order_id}) is empty. Update reflects empty cart."
            )
            # Clearing items will result in a $0 order before payment, might be desired if cart was emptied.

        # Update financial data from the PUT request's payload
        try:
            frontend_financial_data = {
                "subtotal": Decimal(request.data.get("subtotal", "0.00")),
                "tax_amount": Decimal(request.data.get("tax_amount", "0.00")),
                "surcharge_amount": Decimal(
                    request.data.get("surcharge_amount", "0.00")
                ),
                "surcharge_percentage": Decimal(
                    request.data.get("surcharge_percentage", "0.0000")
                ),
                "tip_amount": Decimal(request.data.get("tip_amount", "0.00")),
                "discount_amount": Decimal(request.data.get("discount_amount", "0.00")),
                "total_price": Decimal(request.data.get("total_amount", "0.00")),
            }
        except DecimalInvalidOperation:
            logger.error(f"Invalid decimal format in PUT checkout data: {request.data}")
            return Response(
                {"error": "Invalid number format for financial data (update)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update contact details if provided (optional, or could be restricted)
        order_to_update.guest_first_name = request.data.get(
            "first_name", order_to_update.guest_first_name
        )
        order_to_update.guest_last_name = request.data.get(
            "last_name", order_to_update.guest_last_name
        )
        order_to_update.guest_email = request.data.get(
            "email", order_to_update.guest_email
        )
        order_to_update.guest_phone = request.data.get(
            "phone", order_to_update.guest_phone
        )

        # Update financial fields on the order instance
        order_to_update.calculate_total_price(
            save_instance=False, frontend_values=frontend_financial_data
        )
        order_to_update.save()  # Save updated totals and contact info
        logger.info(
            f"Order {order_to_update.id} updated (PUT) with new total: {order_to_update.total_price}"
        )

        # Update OrderItems: Clear existing and add current cart items
        OrderItem.objects.filter(order=order_to_update).delete()
        new_order_items = []
        if cart:  # Only add items if cart exists
            for item in cart.items.all():
                new_order_items.append(
                    OrderItem(
                        order=order_to_update,
                        product=item.product,
                        quantity=item.quantity,
                        unit_price=item.product.price,
                    )
                )
        OrderItem.objects.bulk_create(new_order_items)
        logger.info(
            f"OrderItems for Order {order_to_update.id} updated from current cart ({len(new_order_items)} items)."
        )

        # Ensure related Payment record is updated with the new total
        payment, _ = Payment.objects.update_or_create(
            order=order_to_update,
            defaults={
                "amount": order_to_update.total_price,
                "status": "pending",
            },  # Keep status pending
        )
        logger.info(
            f"Payment record {payment.id} for order {order_to_update.id} updated with amount {order_to_update.total_price}."
        )

        serializer = WebsiteOrderSerializer(
            order_to_update, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class WebsiteOrderListView(APIView):
    permission_classes = [IsAuthenticated, IsWebsiteUser]

    def get(self, request):
        orders = Order.objects.filter(user=request.user, source="website").order_by(
            "-created_at"
        )
        serializer = WebsiteOrderSerializer(
            orders, many=True, context={"request": request}
        )
        return Response(serializer.data)


class WebsiteOrderDetailView(APIView):
    permission_classes = [IsAuthenticated, IsWebsiteUser]

    def get(self, request, order_id=None):
        # ... (existing logic, no changes needed for this issue) ...
        if order_id:
            try:
                order = Order.objects.get(
                    id=order_id, user=request.user, source="website"
                )
            except Order.DoesNotExist:
                return Response(
                    {"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND
                )
        else:
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


class ReorderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # ... (existing logic, no changes needed for this issue) ...
        order_id = request.data.get("order_id")
        if not order_id:
            return Response(
                {"error": "Order ID is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            original_order = Order.objects.get(id=order_id, user=request.user)
            # Instead of deleting, consider creating a new cart or ensuring the existing one is active
            active_cart, _ = Cart.objects.get_or_create(
                user=request.user, checked_out=False
            )
            active_cart.items.all().delete()  # Clear existing items from the active cart before reordering

            for item in original_order.items.all():
                # Add to the user's single active cart, update quantity if product exists
                cart_item, created = CartItem.objects.get_or_create(
                    cart=active_cart,
                    product=item.product,
                    defaults={"quantity": item.quantity},
                )
                if not created:
                    cart_item.quantity += item.quantity
                    cart_item.save()

            return Response(
                {
                    "success": True,
                    "message": "Items added to your current cart",
                    "cart_id": active_cart.id,
                }
            )
        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to reorder: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
