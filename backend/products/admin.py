from django.contrib import admin
from .models import Category, Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "category",
        "price",
        "barcode",
        "image",
    )  # <-- Add 'barcode'
    list_filter = ("category",)
    search_fields = ("name", "barcode", "description")


admin.site.register(Category)
