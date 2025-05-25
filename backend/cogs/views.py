# pos_and_backend/backend/cogs/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction, IntegrityError
from .models import UnitOfMeasure, InventoryItem, Recipe, ProductCOGS, RecipeComponent
from .serializers import (
    UnitOfMeasureSerializer,
    InventoryItemSerializer,
    RecipeSerializer,
    ProductCOGSSerializer,
    RecipeComponentSerializer,
    Product,
    ProductCOGSComponentLinkSerializer,
)
from rest_framework.permissions import IsAdminUser  # Or your custom permissions
import csv
import zipfile
import io
from django.http import HttpResponse, JsonResponse
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser


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


class ExportAllCogsDataView(APIView):
    permission_classes = [IsAdminUser]  # Or your relevant permission class

    def get(self, request, *args, **kwargs):
        s = io.BytesIO()
        zf = zipfile.ZipFile(s, "w")

        # 1. Units of Measure
        units_qs = UnitOfMeasure.objects.all()
        units_data = []
        for unit in units_qs:
            units_data.append(
                {
                    "id": unit.id,
                    "name": unit.name,
                    "abbreviation": unit.abbreviation,
                    "is_base_unit": unit.is_base_unit,
                    "base_unit_equivalent": unit.base_unit_equivalent,
                }
            )
        self.add_to_zip(
            zf,
            "units_of_measure.csv",
            units_data,
            ["id", "name", "abbreviation", "is_base_unit", "base_unit_equivalent"],
        )

        # 2. Inventory Items
        inventory_qs = InventoryItem.objects.all()
        inventory_data = []
        for item in inventory_qs:
            inventory_data.append(
                {
                    "id": item.id,
                    "name": item.name,
                    "description": item.description,
                    "item_type": item.item_type,
                    "costing_unit_id": item.costing_unit_id,
                    "current_cost_per_unit": item.current_cost_per_unit,
                    "latest_purchase_price": item.latest_purchase_price,
                    "latest_purchase_quantity": item.latest_purchase_quantity,
                    "latest_purchase_unit_id": item.latest_purchase_unit_id,
                    "source_recipe_id": item.source_recipe_id,  # if PREPARED_GOOD
                }
            )
        self.add_to_zip(
            zf,
            "inventory_items.csv",
            inventory_data,
            [
                "id",
                "name",
                "description",
                "item_type",
                "costing_unit_id",
                "current_cost_per_unit",
                "latest_purchase_price",
                "latest_purchase_quantity",
                "latest_purchase_unit_id",
                "source_recipe_id",
            ],
        )

        # 3. Recipes
        recipes_qs = Recipe.objects.all()
        recipes_data = []
        recipe_components_data = []
        for recipe in recipes_qs:
            recipes_data.append(
                {
                    "id": recipe.id,
                    "name": recipe.name,
                    "description": recipe.description,
                    "produces_item_id": recipe.produces_item_id,
                    "yield_quantity": recipe.yield_quantity,
                    # Yield unit is implicit via produces_item.costing_unit
                }
            )
            for comp in recipe.components.all():
                recipe_components_data.append(
                    {
                        "id": comp.id,
                        "recipe_id": recipe.id,
                        "inventory_item_id": comp.inventory_item_id,
                        "quantity": comp.quantity,
                        "quantity_unit_id": comp.quantity_unit_id,
                    }
                )
        self.add_to_zip(
            zf,
            "recipes.csv",
            recipes_data,
            ["id", "name", "description", "produces_item_id", "yield_quantity"],
        )
        self.add_to_zip(
            zf,
            "recipe_components.csv",
            recipe_components_data,
            ["id", "recipe_id", "inventory_item_id", "quantity", "quantity_unit_id"],
        )

        # 4. Product COGS Definitions
        product_cogs_qs = ProductCOGS.objects.all()
        product_cogs_data = []
        product_cogs_components_data = []
        for pcogs in product_cogs_qs:
            product_cogs_data.append(
                {
                    "id": pcogs.id,
                    "product_id": pcogs.product_id,
                    "notes": pcogs.notes,
                    "waste_factor_percentage": pcogs.waste_factor_percentage,
                }
            )
            for item_link in pcogs.items.all():
                product_cogs_components_data.append(
                    {
                        "id": item_link.id,
                        "product_cogs_id": pcogs.id,
                        "inventory_item_id": item_link.inventory_item_id,
                        "quantity": item_link.quantity,
                        "quantity_unit_id": item_link.quantity_unit_id,
                    }
                )
        self.add_to_zip(
            zf,
            "product_cogs_definitions.csv",
            product_cogs_data,
            ["id", "product_id", "notes", "waste_factor_percentage"],
        )
        self.add_to_zip(
            zf,
            "product_cogs_components.csv",
            product_cogs_components_data,
            [
                "id",
                "product_cogs_id",
                "inventory_item_id",
                "quantity",
                "quantity_unit_id",
            ],
        )

        zf.close()
        response = HttpResponse(s.getvalue(), content_type="application/zip")
        response["Content-Disposition"] = "attachment; filename=cogs_data_export.zip"
        return response

    def add_to_zip(self, zf, filename, data, fieldnames):
        if not data:  # Handle empty data case
            csv_buffer = io.StringIO()
            writer = csv.DictWriter(csv_buffer, fieldnames=fieldnames)
            writer.writeheader()  # Write header even if no data
            zf.writestr(filename, csv_buffer.getvalue())
            return

        csv_buffer = io.StringIO()
        writer = csv.DictWriter(csv_buffer, fieldnames=fieldnames)
        writer.writeheader()
        for row in data:
            writer.writerow(row)

        # Reset buffer position to the beginning before reading its content for zf.writestr
        csv_buffer.seek(0)
        zf.writestr(filename, csv_buffer.read())


class ImportAllCogsDataView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        zip_file = request.FILES.get("file")

        if not zip_file or not (
            zip_file.name.endswith(".zip")
            or zip_file.content_type
            in ["application/zip", "application/x-zip-compressed"]
        ):
            return JsonResponse(
                {"error": "Please upload a valid ZIP file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        results = {
            "units_of_measure": {
                "success": 0,
                "errors": [],
                "created": 0,
                "existing": 0,
            },
            "inventory_items": {
                "success": 0,
                "errors": [],
                "created": 0,
                "existing": 0,
            },
            "recipes": {"success": 0, "errors": [], "created": 0, "existing": 0},
            "recipe_components": {
                "success": 0,
                "errors": [],
                "created": 0,
            },  # Typically no "existing" check for link tables by unique CSV ID
            "product_cogs_definitions": {
                "success": 0,
                "errors": [],
                "created": 0,
                "existing": 0,
            },
            "product_cogs_components": {"success": 0, "errors": [], "created": 0},
            "overall_errors": [],
            "debug_zip_contents": [],
            "debug_found_paths": {},
        }

        # Mappings: csv_id -> db_id
        unit_id_map = {}
        inventory_item_id_map = {}
        recipe_id_map = {}
        product_cogs_id_map = {}
        # Product ID map might be needed if products are also imported or looked up
        # product_id_map = {}

        try:
            with zipfile.ZipFile(zip_file, "r") as zf:
                actual_filenames_in_zip = zf.namelist()
                results["debug_zip_contents"] = actual_filenames_in_zip

                def get_csv_content(expected_filename):
                    # Helper to find file, possibly in a subdirectory
                    if expected_filename in actual_filenames_in_zip:
                        results["debug_found_paths"][
                            expected_filename
                        ] = expected_filename
                        return zf.read(expected_filename).decode("utf-8-sig")
                    for name_in_zip in actual_filenames_in_zip:
                        if (
                            name_in_zip.endswith("/" + expected_filename)
                            and name_in_zip.count("/") == 1
                        ):
                            results["debug_found_paths"][
                                expected_filename
                            ] = name_in_zip
                            return zf.read(name_in_zip).decode("utf-8-sig")
                    raise KeyError(
                        f"File '{expected_filename}' not found at root or first-level subdir."
                    )

                # --- 1. Units of Measure ---
                try:
                    filename = "units_of_measure.csv"
                    csv_content = get_csv_content(filename)
                    reader = csv.DictReader(io.StringIO(csv_content))
                    for i, row_data in enumerate(reader):
                        row_num = i + 2
                        try:
                            csv_id = row_data.get("id", "").strip()
                            name = row_data.get("name", "").strip()
                            abbreviation = row_data.get("abbreviation", "").strip()

                            if not name or not abbreviation:
                                results["units_of_measure"]["errors"].append(
                                    f"Row {row_num} in {filename}: Name and abbreviation are required."
                                )
                                continue

                            # Get or Create logic
                            unit, created = UnitOfMeasure.objects.get_or_create(
                                name=name,
                                defaults={
                                    "abbreviation": abbreviation,
                                    "is_base_unit": row_data.get(
                                        "is_base_unit", "False"
                                    )
                                    .strip()
                                    .lower()
                                    == "true",
                                    "base_unit_equivalent": row_data.get(
                                        "base_unit_equivalent", "1.0000"
                                    ).strip(),
                                },
                            )
                            if created:
                                results["units_of_measure"]["created"] += 1
                                # If not created, but abbreviation differs, update it (optional logic)
                            elif (
                                unit.abbreviation != abbreviation
                            ):  # Or other fields you want to update
                                unit.abbreviation = abbreviation
                                unit.is_base_unit = (
                                    row_data.get("is_base_unit", "False")
                                    .strip()
                                    .lower()
                                    == "true"
                                )
                                unit.base_unit_equivalent = row_data.get(
                                    "base_unit_equivalent", "1.0000"
                                ).strip()
                                unit.save()
                                results["units_of_measure"][
                                    "existing"
                                ] += 1  # Count as touched/updated
                            else:
                                results["units_of_measure"]["existing"] += 1

                            results["units_of_measure"]["success"] += 1
                            if csv_id:
                                unit_id_map[csv_id] = unit.id

                        except (
                            IntegrityError
                        ) as e:  # Handles if defaults in get_or_create cause unique conflict for abbreviation
                            results["units_of_measure"]["errors"].append(
                                f"Row {row_num} in {filename} (Integrity Error for name: {name}): {str(e)}"
                            )
                        except Exception as e:
                            results["units_of_measure"]["errors"].append(
                                f"Row {row_num} in {filename} (Data: {row_data}): {str(e)}"
                            )
                except KeyError:
                    results["overall_errors"].append(
                        f"Required CSV file '{filename}' not found."
                    )
                except Exception as e:
                    results["overall_errors"].append(
                        f"Error processing '{filename}': {str(e)}"
                    )

                # --- 2. Inventory Items ---
                try:
                    filename = "inventory_items.csv"
                    csv_content = get_csv_content(filename)
                    reader = csv.DictReader(io.StringIO(csv_content))
                    for i, row_data in enumerate(reader):
                        row_num = i + 2
                        try:
                            csv_id = row_data.get("id", "").strip()
                            name = row_data.get("name", "").strip()
                            if not name:
                                results["inventory_items"]["errors"].append(
                                    f"Row {row_num} in {filename}: Name is required."
                                )
                                continue

                            costing_unit_csv_id = row_data.get(
                                "costing_unit_id", ""
                            ).strip()
                            latest_purchase_unit_csv_id = row_data.get(
                                "latest_purchase_unit_id", ""
                            ).strip()
                            source_recipe_csv_id = row_data.get(
                                "source_recipe_id", ""
                            ).strip()

                            defaults = {
                                "description": row_data.get("description", "").strip()
                                or None,
                                "item_type": row_data.get(
                                    "item_type", "RAW_MATERIAL"
                                ).strip(),
                                "costing_unit_id": unit_id_map.get(costing_unit_csv_id)
                                or (
                                    int(costing_unit_csv_id)
                                    if costing_unit_csv_id
                                    else None
                                ),
                                "current_cost_per_unit": row_data.get(
                                    "current_cost_per_unit", "0.00"
                                ).strip(),
                                "latest_purchase_price": row_data.get(
                                    "latest_purchase_price"
                                )
                                or None,
                                "latest_purchase_quantity": row_data.get(
                                    "latest_purchase_quantity"
                                )
                                or None,
                                "latest_purchase_unit_id": unit_id_map.get(
                                    latest_purchase_unit_csv_id
                                )
                                or (
                                    int(latest_purchase_unit_csv_id)
                                    if latest_purchase_unit_csv_id
                                    else None
                                ),
                                "source_recipe_id": recipe_id_map.get(
                                    source_recipe_csv_id
                                )
                                or (
                                    int(source_recipe_csv_id)
                                    if source_recipe_csv_id
                                    else None
                                ),  # Recipe map might not be filled yet
                            }
                            # Ensure None for empty optional decimal/FK fields
                            for key in [
                                "latest_purchase_price",
                                "latest_purchase_quantity",
                            ]:
                                if not defaults[key]:
                                    defaults[key] = None

                            item, created = InventoryItem.objects.get_or_create(
                                name=name, defaults=defaults
                            )
                            if created:
                                results["inventory_items"]["created"] += 1
                            else:  # Update existing item
                                for key, value in defaults.items():
                                    setattr(item, key, value)
                                item.save()
                                results["inventory_items"]["existing"] += 1

                            results["inventory_items"]["success"] += 1
                            if csv_id:
                                inventory_item_id_map[csv_id] = item.id

                        except IntegrityError as e:
                            results["inventory_items"]["errors"].append(
                                f"Row {row_num} in {filename} (Integrity Error for name: {name}): {str(e)}"
                            )
                        except Exception as e:
                            results["inventory_items"]["errors"].append(
                                f"Row {row_num} in {filename} (Data: {row_data}): {str(e)}"
                            )
                except KeyError:
                    results["overall_errors"].append(
                        f"Required CSV file '{filename}' not found."
                    )
                except Exception as e:
                    results["overall_errors"].append(
                        f"Error processing '{filename}': {str(e)}"
                    )

                # --- 3. Recipes ---
                # (Ensure RecipeSerializer allows components to be optional or handles it)
                # The RecipeSerializer had `produces_item_id` (source='produces_item') and components fields.
                # We will set components to [] during this step.
                try:
                    filename = "recipes.csv"
                    csv_content = get_csv_content(filename)
                    reader = csv.DictReader(io.StringIO(csv_content))
                    for i, row_data in enumerate(reader):
                        row_num = i + 2
                        try:
                            csv_id = row_data.get("id", "").strip()
                            name = row_data.get("name", "").strip()
                            produces_item_csv_id = row_data.get(
                                "produces_item_id", ""
                            ).strip()

                            if not name or not produces_item_csv_id:
                                results["recipes"]["errors"].append(
                                    f"Row {row_num} in {filename}: Name and produces_item_id are required."
                                )
                                continue

                            actual_produces_item_id = inventory_item_id_map.get(
                                produces_item_csv_id
                            ) or (
                                int(produces_item_csv_id)
                                if produces_item_csv_id
                                else None
                            )
                            if not actual_produces_item_id:
                                results["recipes"]["errors"].append(
                                    f"Row {row_num} in {filename}: Could not map produces_item_id '{produces_item_csv_id}'."
                                )
                                continue

                            # Prepare data for serializer
                            data_for_serializer = {
                                "name": name,
                                "description": row_data.get("description", "").strip()
                                or None,
                                "produces_item": actual_produces_item_id,  # Serializer expects 'produces_item' due to source mapping for 'produces_item_id'
                                "yield_quantity": row_data.get(
                                    "yield_quantity", "1.0"
                                ).strip(),
                                "components": [],  # Handle components in the next step
                            }

                            # Get or create recipe
                            recipe, created = Recipe.objects.get_or_create(
                                name=name, defaults=data_for_serializer
                            )
                            if created:
                                results["recipes"]["created"] += 1
                            else:  # Update existing
                                recipe.description = data_for_serializer["description"]
                                recipe.produces_item_id = data_for_serializer[
                                    "produces_item"
                                ]
                                recipe.yield_quantity = data_for_serializer[
                                    "yield_quantity"
                                ]
                                # Note: `produces_item.costing_unit` determines implicit yield unit.
                                recipe.save()  # This will also trigger calculate_recipe_costs if model save is configured that way
                                results["recipes"]["existing"] += 1

                            results["recipes"]["success"] += 1
                            if csv_id:
                                recipe_id_map[csv_id] = recipe.id

                        except IntegrityError as e:
                            results["recipes"]["errors"].append(
                                f"Row {row_num} in {filename} (Integrity Error for name: {name}): {str(e)}"
                            )
                        except Exception as e:
                            results["recipes"]["errors"].append(
                                f"Row {row_num} in {filename} (Data: {row_data}): {str(e)}"
                            )
                except KeyError:
                    results["overall_errors"].append(
                        f"Required CSV file '{filename}' not found."
                    )
                except Exception as e:
                    results["overall_errors"].append(
                        f"Error processing '{filename}': {str(e)}"
                    )

                # --- 4. Recipe Components ---
                try:
                    filename = "recipe_components.csv"
                    csv_content = get_csv_content(filename)
                    reader = csv.DictReader(io.StringIO(csv_content))
                    for i, row_data in enumerate(reader):
                        row_num = i + 2
                        try:
                            recipe_csv_id = row_data.get("recipe_id", "").strip()
                            inventory_item_csv_id = row_data.get(
                                "inventory_item_id", ""
                            ).strip()
                            quantity_unit_csv_id = row_data.get(
                                "quantity_unit_id", ""
                            ).strip()

                            actual_recipe_id = recipe_id_map.get(recipe_csv_id) or (
                                int(recipe_csv_id) if recipe_csv_id else None
                            )
                            actual_inventory_item_id = inventory_item_id_map.get(
                                inventory_item_csv_id
                            ) or (
                                int(inventory_item_csv_id)
                                if inventory_item_csv_id
                                else None
                            )
                            actual_quantity_unit_id = unit_id_map.get(
                                quantity_unit_csv_id
                            ) or (
                                int(quantity_unit_csv_id)
                                if quantity_unit_csv_id
                                else None
                            )

                            if not all(
                                [
                                    actual_recipe_id,
                                    actual_inventory_item_id,
                                    actual_quantity_unit_id,
                                    row_data.get("quantity"),
                                ]
                            ):
                                results["recipe_components"]["errors"].append(
                                    f"Row {row_num} in {filename}: Missing required mapped IDs or quantity."
                                )
                                continue

                            data_for_serializer = {
                                "recipe": actual_recipe_id,
                                "inventory_item": actual_inventory_item_id,
                                "quantity": row_data.get("quantity").strip(),
                                "quantity_unit": actual_quantity_unit_id,
                            }
                            # RecipeComponentSerializer expects recipe, inventory_item, quantity_unit (not _id suffixed for write)
                            # The export provides _id suffixed fields. We need to map them.
                            # The serializer already defines inventory_item_id (source=inventory_item) and quantity_unit_id (source=quantity_unit).
                            # So, we should pass the _id suffixed keys.

                            final_data_for_comp_serializer = {
                                "recipe_id": actual_recipe_id,
                                "inventory_item_id": actual_inventory_item_id,  # Correct for serializer
                                "quantity": row_data.get("quantity").strip(),
                                "quantity_unit_id": actual_quantity_unit_id,  # Correct for serializer
                            }

                            # Using get_or_create for components based on recipe and inventory_item (unique_together)
                            component, created = RecipeComponent.objects.get_or_create(
                                recipe_id=final_data_for_comp_serializer["recipe_id"],
                                inventory_item_id=final_data_for_comp_serializer[
                                    "inventory_item_id"
                                ],
                                defaults=final_data_for_comp_serializer,
                            )
                            if created:
                                results["recipe_components"]["created"] += 1
                            else:  # Update quantity and unit
                                component.quantity = final_data_for_comp_serializer[
                                    "quantity"
                                ]
                                component.quantity_unit_id = (
                                    final_data_for_comp_serializer["quantity_unit_id"]
                                )
                                component.save()
                                # existing count not really applicable here as we are matching on FKs

                            results["recipe_components"]["success"] += 1
                        except Exception as e:
                            results["recipe_components"]["errors"].append(
                                f"Row {row_num} in {filename} (Data: {row_data}): {str(e)}"
                            )
                except KeyError:
                    results["overall_errors"].append(
                        f"Required CSV file '{filename}' not found."
                    )
                except Exception as e:
                    results["overall_errors"].append(
                        f"Error processing '{filename}': {str(e)}"
                    )

                # --- TODO: 5. Product COGS Definitions (similar get_or_create and mapping logic) ---
                # Ensure Product model is available and product_id mapping is handled
                # Results key: 'product_cogs_definitions'

                # --- TODO: 6. Product COGS Components (similar mapping logic) ---
                # Results key: 'product_cogs_components'

                # After all components are potentially added/updated, recalculate costs
                for recipe_csv_id, db_recipe_id in recipe_id_map.items():
                    try:
                        recipe_instance = Recipe.objects.get(id=db_recipe_id)
                        recipe_instance.calculate_recipe_costs()
                        recipe_instance.save()
                        # If produces_item.save() is needed and not handled by signals:
                        if recipe_instance.produces_item:
                            recipe_instance.produces_item.save()
                    except Recipe.DoesNotExist:
                        pass  # Should not happen if mapping is correct
                    except Exception as e_calc:
                        results["overall_errors"].append(
                            f"Error recalculating costs for recipe (CSV ID {recipe_csv_id}, DB ID {db_recipe_id}): {str(e_calc)}"
                        )

        except zipfile.BadZipFile:
            return JsonResponse(
                {"error": "Invalid or corrupted ZIP file."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            results["overall_errors"].append(
                f"An unexpected error occurred during ZIP processing: {str(e)}"
            )
            # No need to return here, final status will be determined below.

        final_status = (
            status.HTTP_201_CREATED
        )  # Assume success unless errors dictate otherwise
        if any(results["overall_errors"]):
            final_status = (
                status.HTTP_400_BAD_REQUEST
            )  # If there are fundamental ZIP/file processing errors
        elif any(
            len(res_detail["errors"]) > 0
            for _, res_detail in results.items()
            if isinstance(res_detail, dict) and "errors" in res_detail
        ):
            final_status = (
                status.HTTP_207_MULTI_STATUS
            )  # Partial success with some row/validation errors

        return JsonResponse(
            {
                "message": (
                    "Import process completed."
                    if final_status != status.HTTP_400_BAD_REQUEST
                    else "Import failed or completed with errors."
                ),
                "results": results,
            },
            status=final_status,
        )
