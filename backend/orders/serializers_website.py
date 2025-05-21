# orders/serializers_website.py

from rest_framework import serializers
from .models import Order, OrderItem, Cart, CartItem
from products.models import Product
from decimal import Decimal, ROUND_HALF_UP


class ProductSummarySerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "price", "image"]

    def get_image(self, obj):
        if hasattr(obj, "get_image") and callable(getattr(obj, "get_image")):
            return obj.get_image()
        return None


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSummarySerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), write_only=True, source="product"
    )
    total_price = serializers.SerializerMethodField()
    product_name = serializers.CharField(source="product.name", read_only=True)
    item_price = serializers.DecimalField(
        source="product.price", max_digits=10, decimal_places=2, read_only=True
    )
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product",
            "product_id",
            "product_name",
            "item_price",
            "quantity",
            "total_price",
            "added_at",
            "image_url",
        ]
        read_only_fields = ["id", "product_name", "item_price", "added_at", "image_url"]

    def get_total_price(self, obj):
        price = obj.product.price if obj.product else 0
        quantity = obj.quantity if obj.quantity else 0
        return float(price * quantity)

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.product.image and hasattr(obj.product.image, "url") and request:
            return request.build_absolute_uri(obj.product.image.url)
        return None

    def create(self, validated_data):
        cart = validated_data.get("cart")
        product = validated_data.get("product")
        quantity = validated_data.get("quantity", 1)
        existing_item = CartItem.objects.filter(cart=cart, product=product).first()
        if existing_item:
            existing_item.quantity += quantity
            existing_item.save()
            return existing_item
        return CartItem.objects.create(cart=cart, product=product, quantity=quantity)


class CartSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "id",
            "items",
            "total_price",
            "item_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_items(self, obj):
        return CartItemSerializer(obj.items.all(), many=True, context=self.context).data

    def get_total_price(self, obj):
        return float(obj.get_total_price())

    def get_item_count(self, obj):
        return obj.items.count()


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSummarySerializer(read_only=True)
    total_price = serializers.SerializerMethodField()
    product_name = serializers.CharField(source="product.name", read_only=True)
    item_price = serializers.DecimalField(
        source="unit_price", max_digits=10, decimal_places=2, read_only=True
    )
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_name",
            "quantity",
            "item_price",  # This is the unit_price at the time of order
            "unit_price",  # Explicitly including if needed, same as item_price here
            "total_price",
            "image_url",
        ]
        read_only_fields = [
            "id",
            "unit_price",
        ]  # unit_price is set at OrderItem creation

    def get_total_price(self, obj):
        return float(obj.get_total_price())

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.product.image and hasattr(obj.product.image, "url") and request:
            return request.build_absolute_uri(obj.product.image.url)
        return None


class WebsiteOrderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_status_display = serializers.CharField(
        source="get_payment_status_display", read_only=True
    )
    customer_name = serializers.SerializerMethodField()

    # These will now primarily reflect stored frontend values
    subtotal = serializers.SerializerMethodField()
    tax = serializers.SerializerMethodField()
    surcharge_amount_display = serializers.DecimalField(
        source="surcharge_amount", max_digits=10, decimal_places=2, read_only=True
    )
    surcharge_percentage_display = serializers.SerializerMethodField(
        method_name="get_surcharge_percentage_for_display"
    )
    tip_amount_display = serializers.DecimalField(
        source="tip_amount", max_digits=10, decimal_places=2, read_only=True
    )
    discount_amount_display = serializers.DecimalField(
        source="discount_amount", max_digits=10, decimal_places=2, read_only=True
    )

    delivery_fee = (
        serializers.SerializerMethodField()
    )  # Kept for consistency, returns 0
    total_amount = (
        serializers.SerializerMethodField()
    )  # This will show the stored total_price
    payment_method_display = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "status_display",
            "payment_status",
            "payment_status_display",
            "total_price",  # The main total_price field from the model
            "items",
            "created_at",
            "updated_at",
            "customer_name",
            "guest_first_name",
            "guest_last_name",
            "guest_email",
            "guest_phone",
            "subtotal",  # Method field, will use subtotal_from_frontend
            "tax",  # Method field, will use tax_amount_from_frontend
            "surcharge_amount_display",  # Direct display of stored surcharge_amount
            "surcharge_percentage_display",  # Method field for surcharge percentage
            "tip_amount_display",  # Direct display of stored tip_amount
            "discount_amount_display",  # Direct display of stored discount_amount
            "delivery_fee",
            "total_amount",  # Method field, will use the stored total_price
            "payment_method_display",
            # Include the direct model fields if needed for specific frontend binding, though methods above handle display logic
            "subtotal_from_frontend",
            "tax_amount_from_frontend",
            "surcharge_amount",
            "surcharge_percentage",
            "tip_amount",
            "discount_amount",
        ]
        read_only_fields = [
            "id",
            "status_display",
            "payment_status_display",
            # "total_price", # This is now set by frontend via view, so serializer shouldn't restrict it if used for writing elsewhere
            "created_at",
            "updated_at",
            "customer_name",
            "items",
            "subtotal",
            "tax",
            "surcharge_amount_display",
            "surcharge_percentage_display",
            "tip_amount_display",
            "discount_amount_display",
            "delivery_fee",
            "total_amount",
            "payment_method_display",
        ]

    def get_items(self, obj):
        return OrderItemSerializer(
            obj.items.all(), many=True, context=self.context
        ).data

    def get_customer_name(self, obj):
        if obj.user:
            return (
                f"{obj.user.first_name} {obj.user.last_name}".strip()
                or obj.user.username
            )
        return f"{obj.guest_first_name} {obj.guest_last_name}".strip() or "Guest"

    def get_subtotal(self, obj):
        # Prioritize the stored frontend subtotal
        if obj.subtotal_from_frontend is not None:
            return float(obj.subtotal_from_frontend)
        # Fallback if for some reason it's not set (should not happen in MVP flow)
        calculated_subtotal = sum(item.get_total_price() for item in obj.items.all())
        return float(calculated_subtotal)

    def get_tax(self, obj):
        # Prioritize the stored frontend tax amount
        if obj.tax_amount_from_frontend is not None:
            return float(obj.tax_amount_from_frontend)
        # Fallback calculation (should not be primary path for MVP)
        subtotal_val = (
            obj.subtotal_from_frontend
            if obj.subtotal_from_frontend is not None
            else sum(item.get_total_price() for item in obj.items.all())
        )
        discount_val = obj.discount_amount or Decimal("0.00")
        surcharge_val = obj.surcharge_amount or Decimal("0.00")
        amount_before_tax = max(
            Decimal("0.00"), Decimal(subtotal_val) - discount_val + surcharge_val
        )
        calculated_tax = (
            amount_before_tax * Decimal("0.10")
        ).quantize(  # Assuming 10% tax
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        return float(calculated_tax)

    def get_surcharge_percentage_for_display(self, obj):
        # Display stored surcharge percentage
        surcharge_perc = obj.surcharge_percentage or Decimal("0.0000")
        if surcharge_perc > 0:
            return f"{(surcharge_perc * 100).quantize(Decimal('0.1'))}%"  # E.g., "3.5%"
        return None  # Or "0%" or an empty string, depending on desired display for zero

    def get_delivery_fee(self, obj):
        return 0.00

    def get_total_amount(self, obj):
        # This will display the order's total_price, which is set from frontend in MVP
        return float(obj.total_price)

    def get_payment_method_display(self, obj):
        if hasattr(obj, "payment") and obj.payment and obj.payment.payment_method:
            return obj.payment.get_payment_method_display()
        return "N/A"
