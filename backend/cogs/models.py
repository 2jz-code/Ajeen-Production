# pos_and_backend/backend/cogs/models.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from products.models import Product  #
from decimal import Decimal, ROUND_HALF_UP


class UnitOfMeasure(models.Model):
    name = models.CharField(
        max_length=50,
        unique=True,
        help_text=_("e.g., Kilogram, Gram, Liter, Milliliter, Piece, Each"),
    )
    abbreviation = models.CharField(
        max_length=20, unique=True, help_text=_("e.g., kg, g, L, mL, pc, ea")
    )
    # For potential conversions, if needed later. For now, direct cost calculation relies on consistent unit usage.
    is_base_unit = models.BooleanField(
        default=False,
        help_text=_("Is this a fundamental unit for its type (e.g., gram for weight)?"),
    )
    base_unit_equivalent = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=Decimal("1.0"),
        help_text=_(
            "For unit conversion: How many of the smallest common unit (e.g., grams) does this unit represent?"
        ),
    )

    def __str__(self):
        return f"{self.name} ({self.abbreviation})"


class InventoryItem(models.Model):
    """
    Represents items that are purchased or produced by a recipe, and then used in other recipes or final products.
    e.g., Flour, Sugar, 12oz Cup, Prepared Pizza Dough, Bottled Water, Labor for Assembly.
    """

    ITEM_TYPE_CHOICES = [
        ("RAW_MATERIAL", _("Raw Material")),  # e.g. Flour, sugar
        ("PACKAGING", _("Packaging")),  # e.g. Cup, box
        (
            "PREPARED_GOOD",
            _("Prepared Good"),
        ),  # Output of a Recipe, e.g. Pizza Dough, Tomato Sauce
        (
            "OTHER_DIRECT_COST",
            _("Other Direct Cost"),
        ),  # e.g. specific per-item labor not in a recipe
    ]
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    item_type = models.CharField(
        max_length=20, choices=ITEM_TYPE_CHOICES, default="RAW_MATERIAL"
    )

    # Costing unit for this item (e.g. cost per gram, per piece, per ml)
    costing_unit = models.ForeignKey(
        UnitOfMeasure,
        on_delete=models.PROTECT,
        related_name="inventory_items_costed_in_this_unit",
    )
    current_cost_per_unit = models.DecimalField(
        max_digits=12,
        decimal_places=6,
        default=Decimal("0.000000"),
        help_text=_(
            "Cost per costing_unit. For RAW_MATERIAL/PACKAGING, calculated from purchase. For PREPARED_GOOD, from its recipe."
        ),
    )

    # Purchase details (relevant if item_type is RAW_MATERIAL or PACKAGING)
    latest_purchase_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("e.g., 25.00"),
    )
    latest_purchase_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        help_text=_("e.g., 22.680"),
    )
    latest_purchase_unit = models.ForeignKey(
        UnitOfMeasure,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_items_purchased_in_this_unit",
    )

    # Link to the recipe that produces this item (if it's a PREPARED_GOOD)
    # Filled by a signal when a Recipe that produces this item is saved/updated.
    source_recipe = models.OneToOneField(
        "Recipe",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="produced_inventory_item_link",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_cost_from_purchase(self):
        if self.item_type not in ["RAW_MATERIAL", "PACKAGING"]:
            return False  # Only calculate for these types from purchase

        if not all(
            [
                self.latest_purchase_price,
                self.latest_purchase_quantity,
                self.latest_purchase_unit,
                self.costing_unit,
            ]
        ):
            self.current_cost_per_unit = Decimal("0.00")
            return False

        try:
            # Convert purchase quantity to costing_unit quantity
            # Assumes latest_purchase_unit.base_unit_equivalent and costing_unit.base_unit_equivalent are correctly set
            # relative to a common fundamental unit (e.g. grams for weight, ml for volume)
            # Total fundamental units purchased = latest_purchase_quantity * latest_purchase_unit.base_unit_equivalent
            # Cost per fundamental unit = latest_purchase_price / total_fundamental_units_purchased
            # Cost per costing_unit = cost_per_fundamental_unit * costing_unit.base_unit_equivalent

            total_fundamental_units_in_purchase = (
                self.latest_purchase_quantity
                * self.latest_purchase_unit.base_unit_equivalent
            )
            if total_fundamental_units_in_purchase == 0:
                self.current_cost_per_unit = Decimal("0.00")
                return False

            cost_per_fundamental_unit = (
                self.latest_purchase_price / total_fundamental_units_in_purchase
            )
            self.current_cost_per_unit = (
                cost_per_fundamental_unit * self.costing_unit.base_unit_equivalent
            ).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)
            return True
        except Exception as e:
            print(f"Error calculating cost for InventoryItem {self.name}: {e}")
            self.current_cost_per_unit = Decimal("0.00")
            return False

    def update_cost_from_recipe(self, recipe_cost_per_yield_unit):
        if self.item_type == "PREPARED_GOOD":
            # Assuming recipe_cost_per_yield_unit is already in the correct costing_unit for this InventoryItem
            self.current_cost_per_unit = recipe_cost_per_yield_unit
            return True
        return False

    def save(self, *args, **kwargs):
        if self.item_type in ["RAW_MATERIAL", "PACKAGING"]:
            self.calculate_cost_from_purchase()
        # Cost for PREPARED_GOOD is updated by Recipe's signal.
        # Cost for OTHER_DIRECT_COST is typically manually entered or set via other means.
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.get_item_type_display()}) - ${self.current_cost_per_unit}/{self.costing_unit.abbreviation}"


class Recipe(models.Model):
    """Defines how a PREPARED_GOOD InventoryItem is made from other InventoryItems."""

    name = models.CharField(
        max_length=255,
        unique=True,
        help_text=_("e.g., 'Standard Pizza Dough Batch', 'Tomato Sauce v2'"),
    )
    description = models.TextField(blank=True, null=True)

    # What InventoryItem does this recipe produce? This item should be of type PREPARED_GOOD.
    produces_item = models.OneToOneField(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="defining_recipe",
        limit_choices_to={"item_type": "PREPARED_GOOD"},
    )

    yield_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        help_text=_("How much of 'produces_item' does one batch of this recipe make?"),
    )
    # The unit of yield is implicitly produces_item.costing_unit

    total_components_cost = models.DecimalField(
        max_digits=12,
        decimal_places=6,
        default=Decimal("0.000000"),
        editable=False,
        help_text=_("Calculated total cost of all components for one batch."),
    )
    # Cost per unit of the 'produces_item.costing_unit'
    calculated_cost_per_produced_unit = models.DecimalField(
        max_digits=12, decimal_places=6, default=Decimal("0.000000"), editable=False
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_recipe_costs(self):
        current_total_cost = Decimal("0.000000")
        for component_link in self.components.all():
            # component_link.inventory_item is the ingredient.
            # component_link.quantity is how much of it is used.
            # component_link.quantity_unit is the unit for that quantity.
            # We need to convert component_link.quantity (in component_link.quantity_unit) to component_link.inventory_item.costing_unit

            cost_item = component_link.inventory_item
            qty_used = component_link.quantity
            unit_used = (
                component_link.quantity_unit
            )  # Unit of the quantity specified in the recipe component

            # Convert quantity_used to the cost_item's costing_unit.
            # Example: recipe uses 1kg of flour. Flour cost is per gram.
            # qty_in_costing_units = qty_used (1) * unit_used.base_unit_equivalent (1000 for kg) / cost_item.costing_unit.base_unit_equivalent (1 for gram)
            # This assumes base_unit_equivalents are all relative to a common fundamental unit (e.g. grams for all weight, ml for all volume)
            if unit_used.base_unit_equivalent == Decimal(
                "0.0"
            ) or cost_item.costing_unit.base_unit_equivalent == Decimal(
                "0.0"
            ):  # Avoid division by zero
                qty_in_costing_units = Decimal("0.0")  # Or handle error
            else:
                qty_in_costing_units = (
                    qty_used * unit_used.base_unit_equivalent
                ) / cost_item.costing_unit.base_unit_equivalent

            component_cost_in_recipe = (
                qty_in_costing_units * cost_item.current_cost_per_unit
            )
            current_total_cost += component_cost_in_recipe

        self.total_components_cost = current_total_cost.quantize(
            Decimal("0.000001"), rounding=ROUND_HALF_UP
        )

        if self.yield_quantity > 0:
            self.calculated_cost_per_produced_unit = (
                self.total_components_cost / self.yield_quantity
            ).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)
        else:
            self.calculated_cost_per_produced_unit = Decimal("0.000000")

        # Update the linked InventoryItem (PREPARED_GOOD)
        if self.produces_item:
            self.produces_item.update_cost_from_recipe(
                self.calculated_cost_per_produced_unit
            )
            # The signal for InventoryItem will save it. Or save it here:
            # self.produces_item.save(update_fields=['current_cost_per_unit', 'updated_at'])

    def save(self, *args, **kwargs):
        # Costs are calculated by signals when components change, or by admin action.
        # Link this recipe back to the InventoryItem it produces
        if self.produces_item:
            self.produces_item.source_recipe = self
            # The InventoryItem's save signal might be complex to manage from here
            # It's better if the InventoryItem signal is independent or if we save it after this.
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Recipe: {self.name} (Produces: {self.produces_item.name}, Cost: ${self.calculated_cost_per_produced_unit}/{self.produces_item.costing_unit.abbreviation})"


class RecipeComponent(models.Model):
    """Links an InventoryItem as a component/ingredient to a Recipe."""

    recipe = models.ForeignKey(
        Recipe, related_name="components", on_delete=models.CASCADE
    )
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        help_text=_("The ingredient or component item"),
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    quantity_unit = models.ForeignKey(
        UnitOfMeasure,
        on_delete=models.PROTECT,
        help_text=_("Unit for the quantity field, e.g., grams, ml, pieces"),
    )

    class Meta:
        unique_together = ("recipe", "inventory_item")

    def __str__(self):
        return f"{self.quantity} {self.quantity_unit.abbreviation} of {self.inventory_item.name} in {self.recipe.name}"


class ProductCOGS(models.Model):
    """Defines the complete Cost of Goods Sold for a final sellable Product."""

    product = models.OneToOneField(
        Product, on_delete=models.CASCADE, related_name="cogs_profile"
    )  #
    notes = models.TextField(blank=True, null=True)

    total_components_cost = models.DecimalField(
        max_digits=12, decimal_places=6, default=Decimal("0.000000"), editable=False
    )
    waste_factor_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text=_("e.g., 5.00 for 5% waste. Applied to total_components_cost."),
    )
    final_cogs_per_unit = models.DecimalField(
        max_digits=12,
        decimal_places=6,
        default=Decimal("0.000000"),
        editable=False,
        help_text=_("Total COGS for one unit of the product, including waste."),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_total_cogs(self):
        current_total_components_cost = Decimal("0.000000")
        for item_link in self.items.all():
            cost_item = (
                item_link.inventory_item
            )  # This is an InventoryItem (raw, packaging, or prepared)
            qty_used = item_link.quantity
            unit_used = item_link.quantity_unit

            # Convert qty_used (in unit_used) to cost_item.costing_unit for cost calculation
            if unit_used.base_unit_equivalent == Decimal(
                "0.0"
            ) or cost_item.costing_unit.base_unit_equivalent == Decimal("0.0"):
                qty_in_costing_units = Decimal("0.0")
            else:
                qty_in_costing_units = (
                    qty_used * unit_used.base_unit_equivalent
                ) / cost_item.costing_unit.base_unit_equivalent

            item_cost_in_product = (
                qty_in_costing_units * cost_item.current_cost_per_unit
            )
            current_total_components_cost += item_cost_in_product

            # Save the calculated cost on the link itself for auditing/display
            item_link.calculated_cost = item_cost_in_product.quantize(
                Decimal("0.000001"), rounding=ROUND_HALF_UP
            )
            item_link.save(update_fields=["calculated_cost"])

        self.total_components_cost = current_total_components_cost.quantize(
            Decimal("0.000001"), rounding=ROUND_HALF_UP
        )

        cogs_before_waste = self.total_components_cost
        if self.waste_factor_percentage > 0:
            waste_amount = cogs_before_waste * (
                self.waste_factor_percentage / Decimal("100.00")
            )
            self.final_cogs_per_unit = (cogs_before_waste + waste_amount).quantize(
                Decimal("0.000001"), rounding=ROUND_HALF_UP
            )
        else:
            self.final_cogs_per_unit = cogs_before_waste

    def save(self, *args, **kwargs):
        # Costs are calculated by signals or admin actions
        super().save(*args, **kwargs)

    def __str__(self):
        return f"COGS for {self.product.name}: ${self.final_cogs_per_unit}"


class ProductCOGSComponentLink(models.Model):
    """Links an InventoryItem (raw, packaging, prepared good, or other direct cost) to a ProductCOGS."""

    product_cogs = models.ForeignKey(
        ProductCOGS, related_name="items", on_delete=models.CASCADE
    )
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        help_text=_("The component item used in the final product."),
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        help_text=_("How much of this item is used for one unit of the final product."),
    )
    quantity_unit = models.ForeignKey(
        UnitOfMeasure,
        on_delete=models.PROTECT,
        help_text=_("Unit for the quantity field (e.g., grams, ml, pieces)."),
    )
    calculated_cost = models.DecimalField(
        max_digits=12,
        decimal_places=6,
        default=Decimal("0.000000"),
        editable=False,
        help_text=_("Cost of this component for one unit of the product."),
    )

    class Meta:
        unique_together = (
            "product_cogs",
            "inventory_item",
        )  # Assuming an item isn't listed twice for the same product COGS

    def __str__(self):
        return f"{self.quantity} {self.quantity_unit.abbreviation} of {self.inventory_item.name} for {self.product_cogs.product.name}"
