# pos_and_backend/backend/cogs/serializers.py
from rest_framework import serializers
from .models import (
    UnitOfMeasure,
    InventoryItem,
    Recipe,
    RecipeComponent,
    ProductCOGS,
    ProductCOGSComponentLink,
)
from products.serializers import ProductSerializer # Assuming this import is correct
from products.models import Product # Assuming this import is correct


class UnitOfMeasureSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitOfMeasure
        fields = "__all__"


class InventoryItemSerializer(serializers.ModelSerializer):
    costing_unit_details = UnitOfMeasureSerializer(
        source="costing_unit", read_only=True
    )
    latest_purchase_unit_details = UnitOfMeasureSerializer(
        source="latest_purchase_unit", read_only=True, allow_null=True
    )

    class Meta:
        model = InventoryItem
        fields = (
            "id",
            "name",
            "description",
            "item_type",
            "costing_unit", 
            "costing_unit_details", 
            "current_cost_per_unit",
            "latest_purchase_price",
            "latest_purchase_quantity",
            "latest_purchase_unit", 
            "latest_purchase_unit_details", 
            "source_recipe",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "current_cost_per_unit",
            "created_at",
            "updated_at",
        )

    def validate(self, data):
        item_type = data.get("item_type", getattr(self.instance, "item_type", None))
        if item_type == "PREPARED_GOOD":
            if "current_cost_per_unit" in data and (
                self.instance is None
                or data["current_cost_per_unit"] != self.instance.current_cost_per_unit
            ):
                raise serializers.ValidationError(
                    "Cost for Prepared Good is set by its recipe and cannot be directly edited."
                )
            for field in [
                "latest_purchase_price",
                "latest_purchase_quantity",
                "latest_purchase_unit",
            ]:
                if data.get(field) is not None:
                    raise serializers.ValidationError(
                        f"{field} cannot be set for Prepared Goods."
                    )
        elif item_type in ["RAW_MATERIAL", "PACKAGING"]:
            required_fields_for_new = [
                "latest_purchase_price",
                "latest_purchase_quantity",
                "latest_purchase_unit",
                "costing_unit",
            ]
            if self.instance is None: 
                for field in required_fields_for_new:
                    if data.get(field) is None: # Ensure all required fields are present for new items
                        # Check if the field is missing, not just None if it's allowed to be None by the model
                        if field not in data:
                             raise serializers.ValidationError(
                                f"{field} is required for new Raw Materials/Packaging."
                            )
        return data


class RecipeComponentSerializer(serializers.ModelSerializer):
    inventory_item_details = InventoryItemSerializer(
        source="inventory_item", read_only=True
    )
    quantity_unit_details = UnitOfMeasureSerializer(
        source="quantity_unit", read_only=True
    )
    inventory_item_id = serializers.PrimaryKeyRelatedField(
        queryset=InventoryItem.objects.all(), source="inventory_item", write_only=True
    )
    quantity_unit_id = serializers.PrimaryKeyRelatedField(
        queryset=UnitOfMeasure.objects.all(), source="quantity_unit", write_only=True
    )

    class Meta:
        model = RecipeComponent
        fields = (
            "id",
            "inventory_item_details", 
            "inventory_item_id", 
            "quantity",
            "quantity_unit_details", 
            "quantity_unit_id", 
        )

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation.pop("inventory_item_id", None)
        representation.pop("quantity_unit_id", None)
        
        if instance.inventory_item:
            representation["inventory_item"] = instance.inventory_item.id
        if instance.quantity_unit:
            representation["quantity_unit"] = instance.quantity_unit.id
        return representation


class RecipeSerializer(serializers.ModelSerializer):
    produces_item_details = InventoryItemSerializer(
        source="produces_item", read_only=True
    )
    # NEW: Read-only field to show the implicit yield unit based on the produced item's costing unit
    implicit_yield_unit_details = UnitOfMeasureSerializer( 
        source="produces_item.costing_unit", read_only=True, allow_null=True
    )
    components = RecipeComponentSerializer(many=True)

    produces_item_id = serializers.PrimaryKeyRelatedField(
        queryset=InventoryItem.objects.filter(item_type="PREPARED_GOOD"),
        source="produces_item", 
        write_only=True,
        allow_null=False 
    )
    # REMOVED: yield_unit_id as it's implicit from produces_item.costing_unit

    class Meta:
        model = Recipe
        fields = (
            "id",
            "name",
            "description",
            "produces_item_details", 
            "produces_item_id", 
            "yield_quantity",
            "implicit_yield_unit_details", # NEW: For displaying the implicit unit
            "components",
            "total_components_cost",
            "calculated_cost_per_produced_unit",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "total_components_cost",
            "calculated_cost_per_produced_unit",
            "created_at",
            "updated_at",
            "implicit_yield_unit_details", # Ensure it's read-only
        )

    def create(self, validated_data):
        components_data = validated_data.pop("components", [])
        # 'yield_unit' is not in validated_data as it's implicit
        recipe = Recipe.objects.create(**validated_data)
        for comp_data in components_data:
            RecipeComponent.objects.create(recipe=recipe, **comp_data)
        
        recipe.calculate_recipe_costs() 
        recipe.save() 
        if recipe.produces_item:
            recipe.produces_item.save() 
        return recipe

    def update(self, instance, validated_data):
        components_data = validated_data.pop("components", None)

        instance.name = validated_data.get("name", instance.name)
        instance.description = validated_data.get("description", instance.description)
        instance.yield_quantity = validated_data.get("yield_quantity", instance.yield_quantity)
        
        if "produces_item" in validated_data:
            instance.produces_item = validated_data.get("produces_item")
        
        # 'yield_unit' is not updated directly as it's implicit from produces_item.costing_unit

        if components_data is not None:
            instance.components.all().delete() 
            for comp_data in components_data:
                RecipeComponent.objects.create(recipe=instance, **comp_data)

        instance.calculate_recipe_costs() 
        instance.save() 
        if instance.produces_item:
            instance.produces_item.save() 
        return instance

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation.pop("produces_item_id", None)
        # No yield_unit_id to pop

        if instance.produces_item:
            representation["produces_item"] = instance.produces_item.id
            # For the implicit_yield_unit, ensure it shows the ID if details are not present
            # The UnitOfMeasureSerializer for implicit_yield_unit_details should handle nesting.
            # If you also want just the ID available:
            if instance.produces_item.costing_unit:
                 representation["implicit_yield_unit_id"] = instance.produces_item.costing_unit.id
        return representation


class ProductCOGSComponentLinkSerializer(serializers.ModelSerializer):
    inventory_item_details = InventoryItemSerializer(
        source="inventory_item", read_only=True
    )
    quantity_unit_details = UnitOfMeasureSerializer(
        source="quantity_unit", read_only=True
    )
    inventory_item_id = serializers.PrimaryKeyRelatedField(
        queryset=InventoryItem.objects.all(), source="inventory_item", write_only=True
    )
    quantity_unit_id = serializers.PrimaryKeyRelatedField(
        queryset=UnitOfMeasure.objects.all(), source="quantity_unit", write_only=True
    )

    class Meta:
        model = ProductCOGSComponentLink
        fields = (
            "id",
            "inventory_item_details",
            "inventory_item_id",
            "quantity",
            "quantity_unit_details",
            "quantity_unit_id",
            "calculated_cost",
        )
        read_only_fields = ("calculated_cost",)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep.pop("inventory_item_id", None)
        rep.pop("quantity_unit_id", None)
        if instance.inventory_item:
            rep["inventory_item"] = instance.inventory_item.id
        if instance.quantity_unit:
            rep["quantity_unit"] = instance.quantity_unit.id
        return rep


class ProductCOGSSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source="product", read_only=True)
    items = ProductCOGSComponentLinkSerializer(many=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source="product", write_only=True
    )

    class Meta:
        model = ProductCOGS
        fields = (
            "id",
            "product_details",
            "product_id",
            "notes",
            "items",
            "total_components_cost",
            "waste_factor_percentage",
            "final_cogs_per_unit",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "total_components_cost",
            "final_cogs_per_unit",
            "created_at",
            "updated_at",
        )

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        product_cogs = ProductCOGS.objects.create(**validated_data)
        for item_data in items_data:
            ProductCOGSComponentLink.objects.create(
                product_cogs=product_cogs, **item_data
            )
        product_cogs.calculate_total_cogs() 
        product_cogs.save()
        return product_cogs

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        if "product" in validated_data:
            instance.product = validated_data.get("product")

        instance.notes = validated_data.get("notes", instance.notes)
        instance.waste_factor_percentage = validated_data.get(
            "waste_factor_percentage", instance.waste_factor_percentage
        )

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                ProductCOGSComponentLink.objects.create(
                    product_cogs=instance, **item_data
                )
        instance.calculate_total_cogs() 
        instance.save()
        return instance

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep.pop("product_id", None)
        if instance.product:
            rep["product"] = instance.product.id
        return rep
