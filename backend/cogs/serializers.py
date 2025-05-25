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
from products.serializers import ProductSerializer  #
from products.models import Product


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
    # source_recipe_name = serializers.CharField(source='source_recipe.name', read_only=True, allow_null=True)

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
            "source_recipe",  # 'source_recipe_name', # Keep it simple with ID for now
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "current_cost_per_unit",
            "source_recipe",
            "created_at",
            "updated_at",
        )
        # `current_cost_per_unit` is directly editable only for 'OTHER_DIRECT_COST' type

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
            # Prevent setting purchase details for prepared goods
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
            if not all(
                key in data
                for key in [
                    "latest_purchase_price",
                    "latest_purchase_quantity",
                    "latest_purchase_unit",
                    "costing_unit",
                ]
            ):
                if self.instance is None:  # new instance
                    raise serializers.ValidationError(
                        "Purchase details and costing unit are required for Raw Materials/Packaging."
                    )
        # For OTHER_DIRECT_COST, current_cost_per_unit can be set directly.
        return data


class RecipeComponentSerializer(serializers.ModelSerializer):
    inventory_item_details = InventoryItemSerializer(
        source="inventory_item", read_only=True
    )
    quantity_unit_details = UnitOfMeasureSerializer(
        source="quantity_unit", read_only=True
    )

    # For writing/updates by ID
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
            "inventory_item",
            "inventory_item_details",
            "inventory_item_id",
            "quantity",
            "quantity_unit",
            "quantity_unit_details",
            "quantity_unit_id",
        )

    def to_representation(self, instance):  # Exclude write_only fields from GET
        rep = super().to_representation(instance)
        rep.pop("inventory_item_id", None)
        rep.pop("quantity_unit_id", None)
        return rep


class RecipeSerializer(serializers.ModelSerializer):
    produces_item_details = InventoryItemSerializer(
        source="produces_item", read_only=True
    )
    components = RecipeComponentSerializer(many=True)

    # For writing/updates by ID
    produces_item_id = serializers.PrimaryKeyRelatedField(
        queryset=InventoryItem.objects.filter(item_type="PREPARED_GOOD"),
        source="produces_item",
        write_only=True,
    )

    class Meta:
        model = Recipe
        fields = (
            "id",
            "name",
            "description",
            "produces_item",
            "produces_item_details",
            "produces_item_id",
            "yield_quantity",
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
        )

    def create(self, validated_data):
        components_data = validated_data.pop("components", [])
        recipe = Recipe.objects.create(**validated_data)
        for comp_data in components_data:
            RecipeComponent.objects.create(recipe=recipe, **comp_data)
        # Trigger cost calculation (signals should also handle this)
        recipe.calculate_recipe_costs()
        recipe.save()  # Save calculated costs
        if recipe.produces_item:  # Ensure produced item cost is updated and saved
            recipe.produces_item.save()
        return recipe

    def update(self, instance, validated_data):
        components_data = validated_data.pop("components", None)

        # Update instance fields
        instance.name = validated_data.get("name", instance.name)
        instance.description = validated_data.get("description", instance.description)
        instance.produces_item = validated_data.get(
            "produces_item", instance.produces_item
        )
        instance.yield_quantity = validated_data.get(
            "yield_quantity", instance.yield_quantity
        )
        # instance.save() # Save these base fields

        if components_data is not None:
            # Simple approach: delete existing and create new.
            instance.components.all().delete()
            for comp_data in components_data:
                RecipeComponent.objects.create(recipe=instance, **comp_data)

        instance.calculate_recipe_costs()
        instance.save()
        if instance.produces_item:
            instance.produces_item.save()
        return instance

    def to_representation(self, instance):  # Exclude write_only fields from GET
        rep = super().to_representation(instance)
        rep.pop("produces_item_id", None)
        return rep


class ProductCOGSComponentLinkSerializer(serializers.ModelSerializer):
    inventory_item_details = InventoryItemSerializer(
        source="inventory_item", read_only=True
    )
    quantity_unit_details = UnitOfMeasureSerializer(
        source="quantity_unit", read_only=True
    )

    # For writing/updates by ID
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
            "inventory_item",
            "inventory_item_details",
            "inventory_item_id",
            "quantity",
            "quantity_unit",
            "quantity_unit_details",
            "quantity_unit_id",
            "calculated_cost",
        )
        read_only_fields = ("calculated_cost",)

    def to_representation(self, instance):  # Exclude write_only fields from GET
        rep = super().to_representation(instance)
        rep.pop("inventory_item_id", None)
        rep.pop("quantity_unit_id", None)
        return rep


class ProductCOGSSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source="product", read_only=True)  #
    items = ProductCOGSComponentLinkSerializer(many=True)

    # For writing/updates by ID
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source="product", write_only=True  #
    )

    class Meta:
        model = ProductCOGS
        fields = (
            "id",
            "product",
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

        instance.product = validated_data.get("product", instance.product)
        instance.notes = validated_data.get("notes", instance.notes)
        instance.waste_factor_percentage = validated_data.get(
            "waste_factor_percentage", instance.waste_factor_percentage
        )
        # instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                ProductCOGSComponentLink.objects.create(
                    product_cogs=instance, **item_data
                )

        instance.calculate_total_cogs()
        instance.save()
        return instance

    def to_representation(self, instance):  # Exclude write_only fields from GET
        rep = super().to_representation(instance)
        rep.pop("product_id", None)
        return rep
