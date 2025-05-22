# combined/backend/orders/serializers.py
from rest_framework import serializers
from .models import Order, OrderItem
from products.models import Product
from django.contrib.auth import get_user_model
from payments.serializers import (
    PaymentSerializer,
    Payment,
)
from decimal import Decimal, ROUND_HALF_UP  # Ensure ROUND_HALF_UP is imported

User = get_user_model()


class NestedProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "price", "category"]
        read_only_fields = fields


class NestedOrderItemSerializer(serializers.ModelSerializer):
    product = NestedProductSerializer(read_only=True)
    unit_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "quantity",
            "unit_price",
            "product_name",
            "product",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = NestedOrderItemSerializer(
        many=True, read_only=True
    )  # Keep items read-only for this serializer if they are managed separately
    user_details = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    payment = serializers.SerializerMethodField()
    discount_details = serializers.SerializerMethodField()
    receipt_payload = serializers.SerializerMethodField()
    customer_display_name = serializers.SerializerMethodField()
    customer_display_email = serializers.SerializerMethodField()
    customer_display_phone = serializers.SerializerMethodField()
    surcharge_percentage_display = serializers.SerializerMethodField()

    # Make fields writable that will be sent from frontend for MVP
    total_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False
    )
    discount_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, default=Decimal("0.00")
    )
    tip_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, default=Decimal("0.00")
    )
    surcharge_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=4, required=False, default=Decimal("0.0000")
    )
    surcharge_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, default=Decimal("0.00")
    )
    subtotal_from_frontend = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    tax_amount_from_frontend = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "payment_status",
            "total_price",  # Now potentially writable
            "created_at",
            "updated_at",
            "source",
            "items",
            "user",
            "user_details",
            "created_by",
            "customer_display_name",
            "customer_display_email",
            "customer_display_phone",
            "guest_first_name",
            "guest_last_name",
            "guest_email",
            "guest_phone",
            "payment",
            "discount",  # Keep as FK, discount_amount is separate
            "discount_amount",  # Now writable
            "discount_details",
            "tip_amount",  # Now writable
            "surcharge_percentage",  # Now writable
            "surcharge_percentage_display",
            "surcharge_amount",  # Now writable
            "subtotal_from_frontend",  # New writable field
            "tax_amount_from_frontend",  # New writable field
            "receipt_payload",
        ]
        read_only_fields = [  # Adjust read_only_fields
            "created_at",
            "updated_at",
            "user_details",
            "created_by",
            "payment",
            "discount_details",  # This is based on the 'discount' FK
            "receipt_payload",
            "customer_display_name",
            "customer_display_email",
            "customer_display_phone",
            "surcharge_percentage_display",
            # "surcharge_amount", # No longer read_only if FE sends it
            # "total_price" # No longer read_only
            # "tip_amount" # No longer read_only
            # "discount_amount" # No longer read_only
            # "surcharge_percentage" # No longer read_only
        ]

    def get_surcharge_percentage_display(self, obj):
        # This can still be calculated for display based on the stored percentage
        surcharge_perc = obj.surcharge_percentage or Decimal("0.0000")
        if surcharge_perc > 0:
            return f"{(surcharge_perc * 100).quantize(Decimal('0.1'))}%"
        return None

    def get_user_details(self, obj):
        if obj.user:
            return {"id": obj.user.id, "username": obj.user.username}
        return None

    def get_created_by(self, obj):
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name if full_name else obj.user.username
        elif obj.guest_first_name or obj.guest_last_name:
            return f"{obj.guest_first_name} {obj.guest_last_name} (Guest)"
        return "Guest Customer"

    def get_customer_display_name(self, obj):
        # ... (no change)
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name if full_name else obj.user.username
        elif obj.guest_first_name or obj.guest_last_name:
            return f"{obj.guest_first_name} {obj.guest_last_name}"
        return "N/A"

    def get_customer_display_email(self, obj):
        # ... (no change)
        if obj.user and obj.user.email:
            return obj.user.email
        elif obj.guest_email:
            return obj.guest_email
        return None

    def get_customer_display_phone(self, obj):
        # ... (no change)
        if obj.user and hasattr(obj.user, "phone_number") and obj.user.phone_number:
            return obj.user.phone_number
        elif obj.guest_phone:
            return obj.guest_phone
        return None

    def get_discount_details(self, obj):
        if obj.discount:
            return {
                "id": obj.discount.id,
                "name": obj.discount.name,
                "code": obj.discount.code,
                "discount_type": obj.discount.discount_type,
                "value": obj.discount.value,
                "amount_applied": obj.discount_amount,  # This will show the FE sent amount
            }
        return None

    def get_payment(self, obj):
        try:
            payment = obj.payment
            return PaymentSerializer(payment, context=self.context).data
        except Payment.DoesNotExist:
            return None
        except Exception as e:
            print(f"Error retrieving payment for order {obj.id}: {str(e)}")
            return None

    def get_receipt_payload(self, obj):
        # This method will now primarily reflect the values stored from the frontend
        # or calculated by the modified model methods that prioritize frontend values.

        subtotal = (
            obj.subtotal_from_frontend
            if obj.subtotal_from_frontend is not None
            else obj.calculate_subtotal()
        )
        discount_amount = obj.discount_amount or Decimal("0.00")

        # Use stored surcharge_amount (which should be from frontend if sent)
        surcharge_amount = obj.surcharge_amount or Decimal("0.00")

        # Use stored tax_amount_from_frontend
        tax_amount = (
            obj.tax_amount_from_frontend
            if obj.tax_amount_from_frontend is not None
            else obj.calculate_tax(subtotal - discount_amount + surcharge_amount)
        )

        tip_amount = obj.tip_amount or Decimal("0.00")
        total_amount = obj.total_price or Decimal("0.00")

        receipt_items = [
            {
                "product_name": item.product.name if item.product else "Unknown Item",
                "quantity": item.quantity,
                "unit_price": str(item.unit_price or Decimal("0.00")),
            }
            for item in obj.items.all()
        ]

        receipt_payment_details = None
        try:
            payment = obj.payment
            transactions_data = []
            for txn in payment.transactions.all().order_by("timestamp"):
                txn_data = {
                    "method": txn.payment_method,
                    "amount": str(txn.amount),
                    "status": txn.status,
                    "timestamp": txn.timestamp.isoformat(),
                    "metadata": txn.get_metadata(),
                }
                if txn.payment_method == "cash":
                    metadata = txn.get_metadata()
                    txn_data["cashTendered"] = metadata.get("cashTendered")
                    txn_data["change"] = metadata.get("change")
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

        payload = {
            "id": obj.id,
            "timestamp": obj.created_at.isoformat(),
            "items": receipt_items,
            "subtotal": str(subtotal),
            "discount_amount": str(discount_amount),
            "surcharge_amount": str(surcharge_amount),
            "surcharge_percentage_display": self.get_surcharge_percentage_display(obj),
            "tax": str(tax_amount),
            "tip_amount": str(tip_amount),
            "total_amount": str(total_amount),
            "payment": receipt_payment_details,
        }
        return payload

    def get_kitchen_drinks_payload(self, instance):
        # ... (existing method, no changes needed for surcharge)
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
                        ),
                    }
                )
        if not relevant_items:
            return None
        return {
            "order_id": str(instance.id),
            "order_type": (
                instance.get_order_type_display()
                if hasattr(instance, "get_order_type_display")
                else instance.status
            ),
            "items": relevant_items,
            "timestamp": instance.created_at.isoformat(),
        }

    def get_kitchen_qc_payload(self, instance):
        # ... (existing method, no changes needed for surcharge)
        all_items = [
            {
                "name": item.product.name,
                "quantity": item.quantity,
                "modifiers": (
                    [mod.name for mod in item.selected_modifiers.all()]
                    if hasattr(item, "selected_modifiers")
                    else []
                ),
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
            "order_source": instance.source,
            "items": all_items,
            "special_instructions": (
                instance.notes if hasattr(instance, "notes") and instance.notes else ""
            ),
            "timestamp": instance.created_at.isoformat(),
        }


class OrderListSerializer(serializers.ModelSerializer):
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
        if obj.user:
            return obj.user.username
        elif obj.guest_first_name or obj.guest_last_name:
            return f"{obj.guest_first_name} {obj.guest_last_name} (Guest)"
        else:
            return "Guest Customer"

    def get_item_count(self, obj):
        return obj.items.count()
