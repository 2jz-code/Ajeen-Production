# pos_and_backend/backend/cogs/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from .models import (
    InventoryItem,
    Recipe,
    RecipeComponent,
    ProductCOGS,
    ProductCOGSComponentLink,
)


@receiver(post_save, sender=InventoryItem)
def inventory_item_saved(sender, instance, created, **kwargs):
    """
    If an InventoryItem's cost changes, propagate this to:
    1. Recipes that use it as a component.
    2. ProductCOGS that use it directly.
    """
    if (
        "update_fields" in kwargs
        and kwargs["update_fields"] is not None
        and "current_cost_per_unit" not in kwargs["update_fields"]
    ):
        # If cost didn't change, no need to propagate.
        # Be careful: if update_fields is None, it means all fields might have changed.
        if kwargs["update_fields"] is not None:  # Check if it is not None explicitly
            return

    try:
        with transaction.atomic():
            # Update Recipes using this InventoryItem
            recipes_as_component = Recipe.objects.filter(
                components__inventory_item=instance
            ).distinct()
            for recipe in recipes_as_component:
                recipe.calculate_recipe_costs()  # This method now also updates the recipe.produces_item.current_cost_per_unit
                recipe.save(
                    update_fields=[
                        "total_components_cost",
                        "calculated_cost_per_produced_unit",
                        "updated_at",
                    ]
                )
                if (
                    recipe.produces_item
                ):  # Explicitly save the InventoryItem that this recipe produces
                    recipe.produces_item.save(
                        update_fields=["current_cost_per_unit", "updated_at"]
                    )

            # Update ProductCOGS using this InventoryItem directly
            product_cogs_as_component = ProductCOGS.objects.filter(
                items__inventory_item=instance
            ).distinct()
            for pcogs in product_cogs_as_component:
                pcogs.calculate_total_cogs()
                pcogs.save(
                    update_fields=[
                        "total_components_cost",
                        "final_cogs_per_unit",
                        "updated_at",
                    ]
                )
    except Exception as e:
        print(f"Error in InventoryItem post_save signal for {instance.name}: {e}")


@receiver([post_save, post_delete], sender=RecipeComponent)
def recipe_component_changed(sender, instance, **kwargs):
    """Recalculate parent Recipe costs when a component changes."""
    recipe = instance.recipe
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
            if (
                recipe.produces_item
            ):  # This will trigger InventoryItem post_save signal if cost changes
                recipe.produces_item.save(
                    update_fields=[
                        "current_cost_per_unit",
                        "updated_at",
                        "source_recipe",
                    ]
                )

    except Exception as e:
        print(f"Error in RecipeComponent signal for recipe {recipe.name}: {e}")


@receiver(
    post_save, sender=Recipe
)  # Handle direct changes to Recipe (e.g. yield_quantity)
def recipe_saved(sender, instance, created, **kwargs):
    """
    If a Recipe itself is saved (e.g., yield changes), or its cost is recalculated.
    The cost of its produced InventoryItem must be updated.
    The InventoryItem's post_save signal will then handle further propagation.
    """
    # Ensure source_recipe link is set on the produced item
    if instance.produces_item and instance.produces_item.source_recipe != instance:
        instance.produces_item.source_recipe = instance
        # Avoid recursion if possible, only save if changed or cost updated
        instance.produces_item.save(
            update_fields=["source_recipe", "current_cost_per_unit", "updated_at"]
        )
    elif (
        instance.produces_item
    ):  # Cost might have been updated by calculate_recipe_costs
        # Check if cost actually changed to avoid unnecessary saves/signals
        # This logic is tricky due to float precision; direct save is safer if calculate_recipe_costs was thorough
        instance.produces_item.save(
            update_fields=["current_cost_per_unit", "updated_at"]
        )


@receiver([post_save, post_delete], sender=ProductCOGSComponentLink)
def product_cogs_component_changed(sender, instance, **kwargs):
    """Recalculate parent ProductCOGS costs when a component link changes."""
    product_cogs_profile = instance.product_cogs
    try:
        with transaction.atomic():
            product_cogs_profile.calculate_total_cogs()
            product_cogs_profile.save(
                update_fields=[
                    "total_components_cost",
                    "final_cogs_per_unit",
                    "updated_at",
                ]
            )
    except Exception as e:
        print(
            f"Error in ProductCOGSComponentLink signal for {product_cogs_profile.product.name}: {e}"
        )
