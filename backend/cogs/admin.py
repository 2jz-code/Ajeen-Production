# pos_and_backend/backend/cogs/admin.py
from django.contrib import admin
from django.db import transaction
from .models import (
    UnitOfMeasure,
    InventoryItem,
    Recipe,
    RecipeComponent,
    ProductCOGS,
    ProductCOGSComponentLink,
)


@admin.register(UnitOfMeasure)
class UnitOfMeasureAdmin(admin.ModelAdmin):
    list_display = ("name", "abbreviation", "is_base_unit", "base_unit_equivalent")
    search_fields = ("name", "abbreviation")


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "item_type",
        "costing_unit",
        "current_cost_per_unit",
        "updated_at",
    )
    list_filter = ("item_type", "costing_unit")
    search_fields = ("name", "description")
    readonly_fields = (
        "current_cost_per_unit",
        "source_recipe",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (None, {"fields": ("name", "description", "item_type", "costing_unit")}),
        (
            "Purchase Information (for Raw Material/Packaging)",
            {
                "classes": ("collapse",),
                "fields": (
                    "latest_purchase_price",
                    "latest_purchase_quantity",
                    "latest_purchase_unit",
                ),
            },
        ),
        (
            "Costing Information",
            {"fields": ("current_cost_per_unit",)},
        ),  # current_cost_per_unit is non-editable for PREPARED_GOOD here, set by Recipe
        ("Source (if Prepared Good)", {"fields": ("source_recipe",)}),  # Readonly link
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
    actions = ["recalculate_cost_from_purchase_for_selected"]

    def get_readonly_fields(self, request, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        if obj:
            if obj.item_type == "PREPARED_GOOD":
                readonly.append("current_cost_per_unit")  # Cost comes from recipe
                readonly.extend(
                    [
                        "latest_purchase_price",
                        "latest_purchase_quantity",
                        "latest_purchase_unit",
                    ]
                )
            elif obj.item_type in ["RAW_MATERIAL", "PACKAGING"]:
                # current_cost_per_unit is calculated, but purchase details are editable
                pass
            else:  # OTHER_DIRECT_COST
                readonly.extend(
                    [
                        "latest_purchase_price",
                        "latest_purchase_quantity",
                        "latest_purchase_unit",
                    ]
                )
        return readonly

    @admin.action(description="Recalculate cost from purchase for selected items")
    def recalculate_cost_from_purchase_for_selected(self, request, queryset):
        updated_count = 0
        for item in queryset.filter(item_type__in=["RAW_MATERIAL", "PACKAGING"]):
            if item.calculate_cost_from_purchase():
                item.save(update_fields=["current_cost_per_unit", "updated_at"])
                updated_count += 1
        self.message_user(
            request,
            f"Successfully recalculated costs for {updated_count} raw material/packaging items.",
        )


class RecipeComponentInline(admin.TabularInline):
    model = RecipeComponent
    extra = 1
    autocomplete_fields = ["inventory_item", "quantity_unit"]


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "produces_item_name",
        "yield_quantity_display",
        "calculated_cost_per_produced_unit",
        "updated_at",
    )
    search_fields = ("name", "produces_item__name", "description")
    readonly_fields = (
        "total_components_cost",
        "calculated_cost_per_produced_unit",
        "created_at",
        "updated_at",
    )
    inlines = [RecipeComponentInline]
    autocomplete_fields = ["produces_item"]
    actions = ["recalculate_selected_recipe_costs"]

    def produces_item_name(self, obj):
        return obj.produces_item.name if obj.produces_item else None

    produces_item_name.short_description = "Produces Item"

    def yield_quantity_display(self, obj):
        return f"{obj.yield_quantity} {obj.produces_item.costing_unit.abbreviation if obj.produces_item else ''}"

    yield_quantity_display.short_description = "Yield"

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        instance = form.instance
        try:
            with transaction.atomic():
                instance.calculate_recipe_costs()
                instance.save(
                    update_fields=[
                        "total_components_cost",
                        "calculated_cost_per_produced_unit",
                        "updated_at",
                    ]
                )
                if (
                    instance.produces_item
                ):  # Ensure the produced item's cost is also saved
                    instance.produces_item.save(
                        update_fields=["current_cost_per_unit", "updated_at"]
                    )
        except Exception as e:
            self.message_user(
                request,
                f"Error recalculating costs for Recipe {instance.name}: {e}",
                level="ERROR",
            )

    @admin.action(description="Recalculate costs for selected recipes")
    def recalculate_selected_recipe_costs(self, request, queryset):
        updated_count = 0
        for recipe in queryset:
            try:
                with transaction.atomic():
                    recipe.calculate_recipe_costs()
                    recipe.save(
                        update_fields=[
                            "total_components_cost",
                            "calculated_cost_per_produced_unit",
                            "updated_at",
                        ]
                    )
                    if recipe.produces_item:
                        recipe.produces_item.save(
                            update_fields=["current_cost_per_unit", "updated_at"]
                        )
                    updated_count += 1
            except Exception as e:
                self.message_user(
                    request,
                    f"Error recalculating costs for Recipe {recipe.name}: {e}",
                    level="ERROR",
                )
        self.message_user(
            request, f"Successfully recalculated costs for {updated_count} recipes."
        )


class ProductCOGSComponentLinkInline(admin.TabularInline):
    model = ProductCOGSComponentLink
    extra = 1
    autocomplete_fields = ["inventory_item", "quantity_unit"]
    readonly_fields = ["calculated_cost"]


@admin.register(ProductCOGS)
class ProductCOGSAdmin(admin.ModelAdmin):
    list_display = (
        "product_name",
        "total_components_cost",
        "waste_factor_percentage",
        "final_cogs_per_unit",
        "updated_at",
    )
    search_fields = ("product__name", "notes")
    readonly_fields = (
        "total_components_cost",
        "final_cogs_per_unit",
        "created_at",
        "updated_at",
    )
    inlines = [ProductCOGSComponentLinkInline]
    autocomplete_fields = ["product"]
    actions = ["recalculate_selected_product_cogs"]

    def product_name(self, obj):
        return obj.product.name

    product_name.short_description = "Product"

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        instance = form.instance
        try:
            with transaction.atomic():
                instance.calculate_total_cogs()
                instance.save(
                    update_fields=[
                        "total_components_cost",
                        "final_cogs_per_unit",
                        "updated_at",
                    ]
                )
        except Exception as e:
            self.message_user(
                request,
                f"Error recalculating COGS for {instance.product.name}: {e}",
                level="ERROR",
            )

    @admin.action(description="Recalculate COGS for selected products")
    def recalculate_selected_product_cogs(self, request, queryset):
        updated_count = 0
        for cogs_profile in queryset:
            try:
                with transaction.atomic():
                    cogs_profile.calculate_total_cogs()
                    cogs_profile.save(
                        update_fields=[
                            "total_components_cost",
                            "final_cogs_per_unit",
                            "updated_at",
                        ]
                    )
                    updated_count += 1
            except Exception as e:
                self.message_user(
                    request,
                    f"Error recalculating COGS for {cogs_profile.product.name}: {e}",
                    level="ERROR",
                )
        self.message_user(
            request, f"Successfully recalculated COGS for {updated_count} products."
        )
