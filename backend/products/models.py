from django.db import models
from django.db.models import F  # Import F object


class Category(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return f"{self.name}"


class Product(models.Model):
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to="products/", null=True, blank=True)
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="products"
    )
    description = models.TextField(null=True, blank=True)
    barcode = models.CharField(max_length=255, unique=True, null=True, blank=True)
    is_grocery_item = models.BooleanField(
        default=False, help_text="Check if this is a grocery item with inventory."
    )
    inventory_quantity = models.IntegerField(
        default=0, help_text="Current stock quantity for this grocery item."
    )

    def save(self, *args, **kwargs):
        if self.barcode == "":  # If barcode is an empty string
            self.barcode = None  # Convert it to None (which will be stored as NULL)
        super().save(*args, **kwargs)  # Call the original save method

    def __str__(self):
        return f"{self.name}"

    def deduct_inventory(self, quantity_to_deduct):
        """
        Deducts the given quantity from the product's inventory.
        Uses F() expressions for atomic updates to prevent race conditions.
        """
        if not self.is_grocery_item:
            return  # Only deduct for grocery items

        if quantity_to_deduct <= 0:
            raise ValueError("Quantity to deduct must be positive.")

        # Atomically update the inventory quantity
        # Product.objects.filter(pk=self.pk).update(inventory_quantity=F('inventory_quantity') - quantity_to_deduct)
        # It's generally safer to update the instance directly if you have it,
        # and then save, especially if you need to check the result or perform other actions.
        # However, for direct atomic decrements, the .update() method is good.
        # For this context, we'll update the instance and save it.
        # The signal handler for order completion will call this.

        # Ensure inventory does not go below zero if strict inventory control is needed,
        # or handle negative inventory appropriately based on business logic.
        # For now, we'll allow it to go negative, implying backorders or an issue.
        self.inventory_quantity = F("inventory_quantity") - quantity_to_deduct
        self.save(update_fields=["inventory_quantity"])
        self.refresh_from_db(fields=["inventory_quantity"])  # Get the updated value
