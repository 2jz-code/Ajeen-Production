# combined/backend/payments/models.py
from django.db import models
from orders.models import Order  # Assuming Order is in orders app
import json


# Keep Payment model largely the same for now, but prepare for transactions
class Payment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("partially_refunded", "Partially Refunded"),
        ("refunded", "Refunded"),
        ("voided", "Voided"),
        ("disputed", "Disputed"),  # New
        ("canceled", "Canceled"),  # New
    ]

    PAYMENT_METHOD_CHOICES = [
        ("cash", "Cash"),
        ("credit", "Credit Card"),
        ("split", "Split Payment"),
        ("other", "Other"),
    ]

    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name="payment"
    )
    payment_method = models.CharField(
        max_length=50, choices=PAYMENT_METHOD_CHOICES, blank=True, null=True
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default="pending"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_split_payment = models.BooleanField(default=False)

    def __str__(self):
        return f"Payment {self.id} for Order {self.order.id} - {self.status}"


class PaymentTransaction(models.Model):
    TRANSACTION_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
        (
            "canceled",
            "Canceled",
        ),  # New for consistency if a PI is canceled before charge
    ]
    TRANSACTION_METHOD_CHOICES = [
        ("cash", "Cash"),
        ("credit", "Credit Card"),
        ("other", "Other"),
    ]

    parent_payment = models.ForeignKey(
        Payment, on_delete=models.CASCADE, related_name="transactions"
    )
    payment_method = models.CharField(max_length=50, choices=TRANSACTION_METHOD_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20, choices=TRANSACTION_STATUS_CHOICES, default="pending"
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    transaction_id = models.CharField(
        max_length=255, blank=True, null=True, db_index=True
    )
    metadata_json = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ["timestamp"]

    def __str__(self):
        return f"Txn {self.id} ({self.payment_method}) for Payment {self.parent_payment.id} - {self.amount} [{self.status}]"

    def set_metadata(self, data):
        try:
            self.metadata_json = json.dumps(data)
        except TypeError:
            self.metadata_json = json.dumps({"error": "Data not serializable"})

    def get_metadata(self):
        if not self.metadata_json:
            return {}
        try:
            return json.loads(self.metadata_json)
        except json.JSONDecodeError:
            return {"error": "Invalid JSON in metadata"}
