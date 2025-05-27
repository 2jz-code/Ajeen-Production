# combined-project/backend/products/serializers.py
from rest_framework import serializers
from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


class ProductSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        allow_null=True,
    )
    category_name = serializers.CharField(
        source="category.name", read_only=True, allow_null=True
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "price",
            "image",
            "category",
            "category_name",
            "description",
            "barcode",
            "is_grocery_item",  # <-- Add this line
            "inventory_quantity",  # <-- Add this line
        ]
