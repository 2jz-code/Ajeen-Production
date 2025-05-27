# combined/backend/orders/models.py
from django.db import models
from products.models import Product
from django.contrib.auth import get_user_model
from decimal import Decimal, ROUND_HALF_UP

User = get_user_model()


class Order(models.Model):
    STATUS_CHOICES = [
        ("saved", "Saved"),
        ("in-progress", "In Progress"),
        ("completed", "Completed"),
        ("voided", "Voided"),
        ("preparing", "Preparing"),
        ("pending", "Pending"),
        ("cancelled", "Cancelled"),
    ]

    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
        ("partially_refunded", "Partially Refunded"),
        ("disputed", "Disputed"),
        ("canceled", "Canceled"),
        ("refund_failed", "Refund Failed"),
        ("voided", "Voided"),
    ]

    ORDER_SOURCE_CHOICES = [
        ("pos", "Point of Sale"),
        ("website", "Website"),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="saved")
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default="pending"
    )
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    rewards_profile_id = models.IntegerField(null=True, blank=True)

    guest_id = models.CharField(max_length=255, blank=True, null=True)
    guest_first_name = models.CharField(max_length=100, blank=True, null=True)
    guest_last_name = models.CharField(max_length=100, blank=True, null=True)
    guest_email = models.EmailField(blank=True, null=True)
    guest_phone = models.CharField(max_length=20, blank=True, null=True)

    source = models.CharField(
        max_length=10, choices=ORDER_SOURCE_CHOICES, default="pos"
    )

    discount = models.ForeignKey(
        "discounts.Discount", on_delete=models.SET_NULL, null=True, blank=True
    )
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tip_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    surcharge_percentage = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.0000
    )
    surcharge_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00
    )

    subtotal_from_frontend = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    tax_amount_from_frontend = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )

    kitchen_ticket_printed = models.BooleanField(
        default=False,
        help_text="Flag for direct backend printing, e.g., for POS orders",
    )
    pos_print_jobs_sent = models.BooleanField(
        default=False,
        help_text="Flag if print jobs for this order were sent to POS via WebSocket",
    )
    inventory_processed_for_completion = models.BooleanField(  # <-- Add this line
        default=False,
        help_text="Flag to ensure inventory is deducted only once upon completion/payment.",
    )

    def calculate_subtotal(self):
        if self.subtotal_from_frontend is not None:
            return self.subtotal_from_frontend
        return sum(
            (item.unit_price or Decimal("0.00")) * item.quantity
            for item in self.items.all()
        )

    def calculate_discount(self, subtotal):
        if not self.discount:
            return Decimal("0.00")
        calculated_discount = Decimal("0.00")
        if self.discount.apply_to == "order":
            calculated_discount = self.discount.calculate_discount_amount(subtotal)
        elif self.discount.apply_to == "product":
            for item in self.items.all():
                if self.discount.products.filter(id=item.product.id).exists():
                    item_total = (item.unit_price or Decimal("0.00")) * item.quantity
                    calculated_discount += self.discount.calculate_discount_amount(
                        item_total
                    )
        elif self.discount.apply_to == "category":
            for item in self.items.all():
                if (
                    hasattr(item.product, "category")
                    and item.product.category
                    and self.discount.categories.filter(
                        id=item.product.category.id
                    ).exists()
                ):
                    item_total = (item.unit_price or Decimal("0.00")) * item.quantity
                    calculated_discount += self.discount.calculate_discount_amount(
                        item_total
                    )
        return min(calculated_discount, subtotal)

    def calculate_surcharge(self, subtotal_after_discount):
        if self.surcharge_amount is not None and self.surcharge_amount > 0:
            return self.surcharge_amount
        if self.surcharge_percentage > 0:
            surcharge = (subtotal_after_discount * self.surcharge_percentage).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            return surcharge
        return Decimal("0.00")

    def calculate_tax(self, amount_before_tax):
        if self.tax_amount_from_frontend is not None:
            return self.tax_amount_from_frontend
        tax_rate = Decimal("0.10")
        tax_amount = (amount_before_tax * tax_rate).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        return tax_amount

    def calculate_total_price(
        self, save_instance=True, tip_to_add=None, frontend_values=None
    ):
        if frontend_values:
            self.subtotal_from_frontend = frontend_values.get(
                "subtotal", self.subtotal_from_frontend
            )
            self.discount_amount = frontend_values.get(
                "discount_amount", self.discount_amount
            )
            self.surcharge_percentage = frontend_values.get(
                "surcharge_percentage", self.surcharge_percentage
            )
            self.surcharge_amount = frontend_values.get(
                "surcharge_amount", self.surcharge_amount
            )
            self.tax_amount_from_frontend = frontend_values.get(
                "tax_amount", self.tax_amount_from_frontend
            )
            self.tip_amount = frontend_values.get(
                "tip_amount", tip_to_add if tip_to_add is not None else self.tip_amount
            )
            self.total_price = frontend_values.get("total_price", self.total_price)

            if save_instance:
                self.save(
                    update_fields=[
                        "total_price",
                        "discount_amount",
                        "surcharge_percentage",
                        "surcharge_amount",
                        "tip_amount",
                        "subtotal_from_frontend",
                        "tax_amount_from_frontend",
                    ]
                )
            return self.total_price

        subtotal = self.calculate_subtotal()

        current_discount_amount = self.discount_amount
        if current_discount_amount == Decimal("0.00") and self.discount:
            current_discount_amount = self.calculate_discount(subtotal)
        self.discount_amount = current_discount_amount

        subtotal_after_discount = max(Decimal("0.00"), subtotal - self.discount_amount)

        current_surcharge_amount = self.surcharge_amount
        if (
            current_surcharge_amount == Decimal("0.00")
            and self.surcharge_percentage > 0
        ):
            current_surcharge_amount = self.calculate_surcharge(subtotal_after_discount)
        self.surcharge_amount = current_surcharge_amount

        amount_before_tax = subtotal_after_discount + self.surcharge_amount

        tax_amount = self.tax_amount_from_frontend
        if tax_amount is None:
            tax_amount = self.calculate_tax(amount_before_tax)

        current_tip = (
            tip_to_add
            if tip_to_add is not None
            else (self.tip_amount or Decimal("0.00"))
        )
        self.tip_amount = current_tip

        self.total_price = amount_before_tax + tax_amount + current_tip

        if save_instance:
            self.save(
                update_fields=[
                    "total_price",
                    "discount_amount",
                    "surcharge_percentage",
                    "surcharge_amount",
                    "tip_amount",
                ]
            )
        return self.total_price

    def __str__(self):
        if self.source == "pos":
            return f"POS Order {self.id} - {self.status} - ${self.total_price}"
        else:
            if self.user:
                return f"Web Order {self.id} by {self.user.username} - {self.status} - ${self.total_price}"
            else:
                return f"Web Order {self.id} by Guest ({self.guest_first_name} {self.guest_last_name}) - {self.status} - ${self.total_price}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )

    class Meta:
        unique_together = ("order", "product")

    def save(self, *args, **kwargs):
        if self.unit_price is None and self.product:
            self.unit_price = self.product.price
        super().save(*args, **kwargs)

    def get_total_price(self):
        return (self.unit_price or self.product.price) * self.quantity

    def __str__(self):
        return f"{self.quantity} x {self.product.name} (Order {self.order.id})"


class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    guest_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    checked_out = models.BooleanField(default=False)

    def __str__(self):
        if self.user:
            return f"Cart for {self.user.username}"
        else:
            return f"Cart for Guest ({self.guest_id})"

    def get_total_price(self):
        return sum(item.get_total_price() for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"

    def get_total_price(self):
        return self.product.price * self.quantity
