# combined-project/backend/orders/serializers.py
from rest_framework import serializers
from .models import Order, OrderItem
from products.models import Product  # Import Product model
from django.contrib.auth import get_user_model
from payments.serializers import (
    PaymentSerializer,
    Payment,
)  # Import PaymentSerializer and Payment model
from decimal import Decimal  # Import Decimal

User = get_user_model()


# Product serializer for nesting within OrderItem
class NestedProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product  # Use Product model directly
        fields = ["id", "name", "price", "category"]
        read_only_fields = fields


# OrderItem serializer for nesting within Order
class NestedOrderItemSerializer(serializers.ModelSerializer):
    # Use the NestedProductSerializer defined above
    product = NestedProductSerializer(read_only=True)
    # Add unit_price and product_name for receipt payload construction
    unit_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "quantity",
            "unit_price",  # Price at the time the item was added/order created
            "product_name",  # Direct access to name
            "product",  # Nested product details
        ]


# combined/backend/orders/serializers.py

# ... other imports ...


class OrderSerializer(serializers.ModelSerializer):
    items = NestedOrderItemSerializer(many=True, read_only=True)
    user_details = serializers.SerializerMethodField()  # Keeps user ID and username
    # created_by will now provide a more comprehensive display name
    created_by = serializers.SerializerMethodField()
    payment = serializers.SerializerMethodField()
    discount_details = serializers.SerializerMethodField()
    receipt_payload = serializers.SerializerMethodField()

    # New fields to ensure consistent customer info for POS
    customer_display_name = serializers.SerializerMethodField()
    customer_display_email = serializers.SerializerMethodField()
    customer_display_phone = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "payment_status",
            "total_price",
            "created_at",
            "updated_at",
            "source",
            "items",
            "user",  # Keep the user ID
            "user_details",  # Keeps username and ID from original serializer
            "created_by",  # Now a more general display name field from get_created_by
            # Explicit fields for customer details for POS to consume
            "customer_display_name",
            "customer_display_email",
            "customer_display_phone",
            # Retain original guest fields for data integrity / other uses if needed,
            # but POS should prefer the new 'customer_display_*' fields.
            "guest_first_name",
            "guest_last_name",
            "guest_email",
            "guest_phone",
            "payment",
            "discount",
            "discount_amount",
            "discount_details",
            "tip_amount",
            "receipt_payload",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "user_details",
            "created_by",  # SerializerMethodField
            "payment",
            "discount_details",
            "receipt_payload",
            "customer_display_name",  # SerializerMethodField
            "customer_display_email",  # SerializerMethodField
            "customer_display_phone",  # SerializerMethodField
        ]

    def get_created_by(self, obj):  # This method is ALREADY in your serializer
        """Provides a display name, preferring full name."""
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name if full_name else obj.user.username
        elif obj.guest_first_name or obj.guest_last_name:
            return f"{obj.guest_first_name} {obj.guest_last_name} (Guest)"
        return "Guest Customer"

    def get_customer_display_name(self, obj):
        """Provides a consistent customer name for display."""
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name if full_name else obj.user.username
        elif obj.guest_first_name or obj.guest_last_name:
            return f"{obj.guest_first_name} {obj.guest_last_name}"
        return "N/A"

    def get_customer_display_email(self, obj):
        """Provides a consistent customer email for display."""
        if obj.user and obj.user.email:
            return obj.user.email
        elif obj.guest_email:
            return obj.guest_email
        return None  # Or "N/A"

    def get_customer_display_phone(self, obj):
        """Provides a consistent customer phone for display."""
        if (
            obj.user and hasattr(obj.user, "phone_number") and obj.user.phone_number
        ):  # Assuming 'phone_number' on CustomUser
            return obj.user.phone_number
        elif obj.guest_phone:
            return obj.guest_phone
        return None  # Or "N/A"

    def get_discount_details(self, obj):
        """Return discount details if a discount exists"""
        if obj.discount:
            # Convert Decimal to float or string for JSON compatibility if needed,
            # but the agent handles Decimal, so keep as is for now.
            return {
                "id": obj.discount.id,
                "name": obj.discount.name,
                "code": obj.discount.code,
                "discount_type": obj.discount.discount_type,
                "value": obj.discount.value,  # Keep as Decimal
                "amount_applied": obj.discount_amount,  # Keep as Decimal
            }
        return None

    def get_user_details(self, obj):
        """Return user details if a user exists"""
        if obj.user:
            return {"id": obj.user.id, "username": obj.user.username}
        return None

    def get_created_by(self, obj):
        """Format the creator's name for display"""
        if obj.user:
            return obj.user.username
        elif obj.guest_first_name or obj.guest_last_name:
            return f"{obj.guest_first_name} {obj.guest_last_name} (Guest)"
        else:
            return "Guest Customer"

    def get_payment(self, obj):
        """Get payment information if available"""
        try:
            # Use related_name='payment' from the Payment model
            payment = obj.payment
            # Pass context if PaymentSerializer needs request (e.g., for URLs)
            return PaymentSerializer(payment, context=self.context).data
        except Payment.DoesNotExist:
            return None
        except Exception as e:
            print(f"Error retrieving payment for order {obj.id}: {str(e)}")
            return None

    def get_receipt_payload(self, obj):
        """
        Constructs the specific payload needed by the Local Hardware Agent's
        format_receipt_for_escpos function.
        """
        # Calculate subtotal from items (using stored unit_price)
        # This ensures accuracy even if product prices change later
        subtotal = sum(
            (item.unit_price or Decimal("0.00")) * item.quantity
            for item in obj.items.all()
        )

        # Prepare items list for the receipt
        receipt_items = [
            {
                "product_name": item.product.name if item.product else "Unknown Item",
                "quantity": item.quantity,
                "unit_price": str(item.unit_price or Decimal("0.00")),  # Send as string
            }
            for item in obj.items.all()
        ]

        # Prepare payment details for the receipt
        receipt_payment_details = None
        try:
            payment = obj.payment
            transactions_data = []
            # Access transactions via the related manager
            for txn in payment.transactions.all().order_by("timestamp"):
                txn_data = {
                    "method": txn.payment_method,
                    "amount": str(txn.amount),  # Send as string
                    "status": txn.status,
                    "timestamp": txn.timestamp.isoformat(),
                    "metadata": txn.get_metadata(),  # Get parsed metadata
                }
                # Add cash specific fields if method is cash
                if txn.payment_method == "cash":
                    metadata = txn.get_metadata()
                    txn_data["cashTendered"] = metadata.get(
                        "cashTendered"
                    )  # Get from metadata
                    txn_data["change"] = metadata.get("change")  # Get from metadata
                transactions_data.append(txn_data)

            receipt_payment_details = {
                "method": payment.payment_method,
                "status": payment.status,
                "is_split_payment": payment.is_split_payment,
                "transactions": transactions_data,
            }
        except Payment.DoesNotExist:
            receipt_payment_details = {
                "method": "N/A",
                "status": "pending",
                "transactions": [],
            }
        except Exception as e:
            print(f"Error preparing payment details for receipt (Order {obj.id}): {e}")
            receipt_payment_details = {
                "method": "Error",
                "status": "error",
                "transactions": [],
            }

        # Construct the final payload for the agent
        payload = {
            "id": obj.id,
            "timestamp": obj.created_at.isoformat(),  # Use ISO format timestamp
            "items": receipt_items,
            "subtotal": str(subtotal),  # Send as string
            "discount_amount": str(
                obj.discount_amount or Decimal("0.00")
            ),  # Send as string
            "tax": str(
                obj.calculate_tax()
            ),  # Calculate tax based on discounted subtotal
            "tip_amount": str(obj.tip_amount or Decimal("0.00")),  # Send as string
            "total_amount": str(
                obj.total_price or Decimal("0.00")
            ),  # Send final total as string
            "payment": receipt_payment_details,
            # Add any other fields the format_receipt_for_escpos function might need
        }
        return payload

    def get_kitchen_drinks_payload(self, instance):
        drink_soup_categories = ["Drinks", "Soups"]
        relevant_items = []
        for item in instance.items.all().select_related("product", "product__category"):
            if (
                item.product.category
                and item.product.category.name in drink_soup_categories
            ):
                relevant_items.append(
                    {
                        "name": item.product.name,
                        "quantity": item.quantity,
                        "modifiers": (
                            [mod.name for mod in item.selected_modifiers.all()]
                            if hasattr(item, "selected_modifiers")
                            else []
                        ),  # <--- MODIFIED HERE
                    }
                )
        if not relevant_items:
            return None
        return {
            "order_id": str(
                instance.id
            ),  # Using instance.id as id_string might not exist on Order model directly
            "order_type": (
                instance.get_order_type_display()
                if hasattr(instance, "get_order_type_display")
                else instance.status
            ),  # Safely get display
            "items": relevant_items,
            "timestamp": instance.created_at.isoformat(),  # Add timestamp for kitchen tickets
        }

    def get_kitchen_qc_payload(self, instance):
        all_items = [
            {
                "name": item.product.name,
                "quantity": item.quantity,
                "modifiers": (
                    [mod.name for mod in item.selected_modifiers.all()]
                    if hasattr(item, "selected_modifiers")
                    else []
                ),  # <--- MODIFIED HERE
                # "notes": item.notes, # Assuming item-specific notes are not on OrderItem model.
                # If they were, item.notes would also need hasattr or be a direct field.
            }
            for item in instance.items.all().select_related("product")
        ]
        return {
            "order_id": str(instance.id),
            "order_type": (
                instance.get_order_type_display()
                if hasattr(instance, "get_order_type_display")
                else instance.status
            ),
            "customer_name": (
                f"{instance.guest_first_name} {instance.guest_last_name}".strip()
                if instance.guest_first_name or instance.guest_last_name
                else (
                    instance.user.get_full_name()
                    if instance.user and instance.user.get_full_name()
                    else (instance.user.username if instance.user else "Website Order")
                )
            ),
            "order_source": instance.source,  # <--- ADD THIS FIELD
            "items": all_items,
            "special_instructions": (
                instance.notes if hasattr(instance, "notes") and instance.notes else ""
            ),  # Assuming order-level notes are on 'instance.notes'
            "timestamp": instance.created_at.isoformat(),  # Add timestamp
        }


class OrderListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for order listings that doesn't include nested item details
    """

    created_by = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    payment_status = serializers.CharField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "payment_status",
            "total_price",
            "created_at",
            "updated_at",
            "source",
            "created_by",
            "guest_first_name",
            "guest_last_name",
            "item_count",
            "payment",
        ]

    def get_created_by(self, obj):
        """Format the creator's name for display"""
        if obj.user:
            return obj.user.username
        elif obj.guest_first_name or obj.guest_last_name:
            return f"{obj.guest_first_name} {obj.guest_last_name} (Guest)"
        else:
            return "Guest Customer"

    def get_item_count(self, obj):
        """Return the count of items in the order"""
        # Use the related manager's count() method for efficiency
        return obj.items.count()
