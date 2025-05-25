# pos_and_backend/backend/cogs/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import UnitOfMeasure, InventoryItem, Recipe, ProductCOGS
from .serializers import (
    UnitOfMeasureSerializer,
    InventoryItemSerializer,
    RecipeSerializer,
    ProductCOGSSerializer,
)
from rest_framework.permissions import IsAdminUser  # Or your custom permissions


class UnitOfMeasureViewSet(viewsets.ModelViewSet):
    queryset = UnitOfMeasure.objects.all().order_by("name")
    serializer_class = UnitOfMeasureSerializer
    permission_classes = [IsAdminUser]


class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = (
        InventoryItem.objects.select_related(
            "costing_unit", "latest_purchase_unit", "source_recipe"
        )
        .all()
        .order_by("name")
    )
    serializer_class = InventoryItemSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ["name", "item_type", "costing_unit__name"]
    search_fields = ["name", "description"]

    @action(detail=True, methods=["post"], url_path="recalculate-purchase-cost")
    def recalculate_purchase_cost(self, request, pk=None):
        item = self.get_object()
        if item.item_type not in ["RAW_MATERIAL", "PACKAGING"]:
            return Response(
                {
                    "error": "Cost recalculation from purchase is only for Raw Material or Packaging items."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated = item.calculate_cost_from_purchase()
        if updated:
            item.save(
                update_fields=["current_cost_per_unit", "updated_at"]
            )  # This save will trigger signals
            serializer = self.get_serializer(item)
            return Response(serializer.data)
        return Response(
            {"message": "No changes or unable to calculate."},
            status=status.HTTP_304_NOT_MODIFIED,
        )


class RecipeViewSet(viewsets.ModelViewSet):
    queryset = (
        Recipe.objects.select_related("produces_item__costing_unit")
        .prefetch_related(
            "components__inventory_item__costing_unit", "components__quantity_unit"
        )
        .all()
        .order_by("name")
    )
    serializer_class = RecipeSerializer
    permission_classes = [IsAdminUser]
    search_fields = ["name", "produces_item__name", "description"]

    @action(detail=True, methods=["post"], url_path="recalculate-recipe-cost")
    def recalculate_recipe_cost(self, request, pk=None):
        recipe = self.get_object()
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
                    )  # Triggers InventoryItem signals
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        serializer = self.get_serializer(recipe)
        return Response(serializer.data)


class ProductCOGSViewSet(viewsets.ModelViewSet):
    queryset = (
        ProductCOGS.objects.select_related("product")
        .prefetch_related("items__inventory_item__costing_unit", "items__quantity_unit")
        .all()
        .order_by("product__name")
    )
    serializer_class = ProductCOGSSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ["product__name"]
    search_fields = ["product__name", "notes"]

    @action(detail=True, methods=["post"], url_path="recalculate-total-cogs")
    def recalculate_total_cogs(self, request, pk=None):
        cogs_profile = self.get_object()
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
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        serializer = self.get_serializer(cogs_profile)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="by-product/(?P<product_id>[^/.]+)")
    def by_product(self, request, product_id=None):
        try:
            cogs_profile = ProductCOGS.objects.get(product_id=product_id)
            serializer = self.get_serializer(cogs_profile)
            return Response(serializer.data)
        except ProductCOGS.DoesNotExist:
            return Response(
                {"detail": "COGS profile not found for this product."},
                status=status.HTTP_404_NOT_FOUND,
            )
