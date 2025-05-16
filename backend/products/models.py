from django.db import models


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
    description = models.TextField(null=True, blank=True)  # Added description field
    barcode = models.CharField(
        max_length=255, unique=True, null=True, blank=True
    )  # <-- Add this line

    def __str__(self):
        return f"{self.name}"
