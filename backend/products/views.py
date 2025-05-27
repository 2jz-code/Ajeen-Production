from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import generics, status
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer
from users.permissions import IsAdminUser
import logging
from django.db import transaction  # Import transaction
from django.db.models import F  # Import F object
from django.http import HttpResponse  # Import HttpResponse
import csv  # Import csv module

# Add these imports to your combined/backend/products/views.py
from django.shortcuts import render  # If you plan to have a UI for upload
from rest_framework.parsers import MultiPartParser, FormParser
import io  # For handling in-memory text stream


# Categories (Anyone can view, Admins & Managers can add)
class CategoryList(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method == "POST":  # Restrict adding categories
            return [IsAdminUser()]
        return []  # Allow anyone to GET categories


# Add this to views.py
class CategoryDetail(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a category."""

    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            return [IsAdminUser()]
        return []  # Allow anyone to GET a category

    def update(self, request, *args, **kwargs):
        """Handle category update with validation"""
        try:
            # Call the parent update method
            response = super().update(request, *args, **kwargs)
            return response
        except Exception as e:
            # Handle any errors during update
            return Response(
                {"detail": f"Failed to update category: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        category_id = category.id
        category_name = category.name

        # Get all products for this category with detailed information
        products_in_category = category.products.all()
        product_count = products_in_category.count()

        # Check if there are products in this category
        if product_count > 0:
            # Get first 5 product names for the error message
            product_sample = list(products_in_category.values("id", "name")[:5])
            product_names = ", ".join([p["name"] for p in product_sample])

            # Log detailed information for debugging
            logger.warning(
                f"Attempted to delete category {category_id}: '{category_name}' with {product_count} products. "
                f"Sample products: {product_names}"
            )

            # Return a detailed error response
            return Response(
                {
                    "detail": "Cannot delete category with existing products. Please reassign or delete the products first.",
                    "category": {"id": category_id, "name": category_name},
                    "product_count": product_count,
                    "product_sample": product_sample,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # If no products, proceed with deletion
        return super().destroy(request, *args, **kwargs)


# Products (Anyone can view, Admins & Managers can add)
logger = logging.getLogger(__name__)


class ProductList(generics.ListCreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_permissions(self):
        print("Checking permissions for POST request...")

        if self.request.method == "POST":
            is_authenticated = self.request.user.is_authenticated
            is_admin = self.request.user.groups.filter(name="Admin").exists()

            print(f"User Authenticated: {is_authenticated}")
            print(f"User Admin Status: {is_admin}")

            return [IsAuthenticated(), IsAdminUser()]

        return [AllowAny()]

    def post(self, request, *args, **kwargs):
        print(
            f"POST request received. User: {request.user} - Authenticated: {request.user.is_authenticated}"
        )

        if request.user.is_anonymous:
            print("Unauthorized POST request by an anonymous user.")
            return Response({"error": "User is not authenticated"}, status=401)

        print(f"POST request accepted from user: {request.user}")
        return super().post(request, *args, **kwargs)


# Products (Retrieve, Update, Delete)
class ProductDetail(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a product by its name instead of ID."""

    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    lookup_field = "name"  # ✅ Use `name` instead of `id`

    def get_permissions(self):
        if self.request.method in [
            "PUT",
            "DELETE",
        ]:  # ✅ Restrict updates/deletions to Admins
            return [IsAdminUser()]
        return []  # ✅ Allow anyone to GET a product


class ProductByBarcodeView(APIView):
    permission_classes = [IsAuthenticated]  # Or AllowAny, depending on your needs

    def get(self, request, *args, **kwargs):
        barcode = request.query_params.get("barcode", None)
        if not barcode:
            return Response(
                {"error": "Barcode query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product = Product.objects.get(barcode=barcode)
            serializer = ProductSerializer(product)
            return Response(serializer.data)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found with this barcode."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProductRestockView(APIView):
    """
    API view to bulk restock grocery items.
    Expects a POST request with a list of products and their restock quantities.
    Example payload:
    [
        {"product_id": 1, "restock_quantity": 10},
        {"product_id": 5, "restock_quantity": 25},
        ...
    ]
    """

    permission_classes = [IsAuthenticated, IsAdminUser]

    @transaction.atomic  # Ensures all updates are made or none are
    def post(self, request, *args, **kwargs):
        restock_data = request.data
        if not isinstance(restock_data, list):
            return Response(
                {"error": "Request body must be a list of products to restock."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        successfully_restocked = []
        errors = []

        for item_data in restock_data:
            product_id = item_data.get("product_id")
            restock_quantity_str = item_data.get("restock_quantity")

            if product_id is None or restock_quantity_str is None:
                errors.append(
                    {
                        "item_data": item_data,
                        "error": "Missing 'product_id' or 'restock_quantity'.",
                    }
                )
                continue

            try:
                restock_quantity = int(restock_quantity_str)
                if restock_quantity <= 0:
                    errors.append(
                        {
                            "product_id": product_id,
                            "error": "Restock quantity must be a positive integer.",
                        }
                    )
                    continue
            except ValueError:
                errors.append(
                    {
                        "product_id": product_id,
                        "error": "'restock_quantity' must be an integer.",
                    }
                )
                continue

            try:
                product = Product.objects.select_for_update().get(
                    pk=product_id
                )  # Lock the row for update
                if not product.is_grocery_item:
                    errors.append(
                        {
                            "product_id": product_id,
                            "name": product.name,
                            "error": "Not a grocery item.",
                        }
                    )
                    continue

                original_quantity = product.inventory_quantity
                product.inventory_quantity = F("inventory_quantity") + restock_quantity
                product.save(update_fields=["inventory_quantity"])
                product.refresh_from_db(
                    fields=["inventory_quantity"]
                )  # Get the updated value

                logger.info(
                    f"User {request.user.username} bulk restocked product '{product.name}' (ID: {product.id}) "
                    f"by {restock_quantity}. Old: {original_quantity}, New: {product.inventory_quantity}"
                )
                successfully_restocked.append(
                    {
                        "product_id": product.id,
                        "name": product.name,
                        "old_inventory": original_quantity,
                        "added_quantity": restock_quantity,
                        "new_inventory": product.inventory_quantity,
                    }
                )

            except Product.DoesNotExist:
                errors.append({"product_id": product_id, "error": "Product not found."})
            except Exception as e:
                logger.error(f"Error restocking product ID {product_id}: {str(e)}")
                errors.append(
                    {
                        "product_id": product_id,
                        "error": f"An unexpected error occurred: {str(e)}.",
                    }
                )

        if errors and not successfully_restocked:
            # If all items failed, and it's a significant error type, you might choose to rollback
            # the transaction by raising an exception here. For now, we commit successful ones.
            return Response(
                {
                    "message": "Bulk restock process completed with errors. No items were restocked.",
                    "errors": errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if errors:
            return Response(
                {
                    "message": "Bulk restock partially successful.",
                    "successfully_restocked": successfully_restocked,
                    "errors": errors,
                },
                status=status.HTTP_207_MULTI_STATUS,
            )

        return Response(
            {
                "message": "Bulk restock successful.",
                "successfully_restocked": successfully_restocked,
            },
            status=status.HTTP_200_OK,
        )


class ProductExportCSVView(APIView):
    """
    API view to export all products to a CSV file.
    Accessible only by Admin users.
    """

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, *args, **kwargs):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="products_export.csv"'

        writer = csv.writer(response)
        # Write header row
        writer.writerow(
            [
                "ID",
                "Name",
                "Price",
                "Category ID",
                "Category Name",
                "Description",
                "Barcode",
                "Is Grocery Item",
                "Inventory Quantity",
                "Image URL",
            ]
        )

        products = Product.objects.select_related(
            "category"
        ).all()  # Optimize by fetching category
        for product in products:
            writer.writerow(
                [
                    product.id,
                    product.name,
                    product.price,
                    product.category.id if product.category else "",
                    product.category.name if product.category else "N/A",
                    product.description,
                    product.barcode,
                    product.is_grocery_item,
                    product.inventory_quantity,
                    (
                        request.build_absolute_uri(product.image.url)
                        if product.image
                        else ""
                    ),
                ]
            )

        logger.info(f"User {request.user.username} exported products to CSV.")
        return response


class ProductImportCSVView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = (MultiPartParser, FormParser)

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        csv_file = request.FILES.get("file")

        if not csv_file:
            return Response(
                {"error": "No CSV file provided."}, status=status.HTTP_400_BAD_REQUEST
            )

        if not csv_file.name.endswith(".csv"):
            return Response(
                {"error": "File is not a CSV."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            decoded_file = io.TextIOWrapper(csv_file.file, encoding="utf-8-sig")
            reader = csv.DictReader(decoded_file)

            # Headers expected from the CSV
            # Name is now the primary key for matching.
            # Category Name is used for category lookup/creation.
            # Other fields are for populating data.
            # "ID" column from CSV will be ignored for lookup.
            expected_headers_in_csv = [
                "Name",
                "Price",
                "Category Name",
                "Is Grocery Item",
                "Inventory Quantity",
            ]

            actual_headers_lower = [
                (header.strip().lower() if header else "")
                for header in reader.fieldnames or []
            ]

            missing_essential_headers = [
                header_title
                for header_title in expected_headers_in_csv
                if header_title.lower() not in actual_headers_lower
            ]

            # "Name" is absolutely essential now.
            if "name" not in actual_headers_lower:
                missing_essential_headers.append(
                    "Name"
                )  # Ensure "Name" is listed if missing
                # Remove duplicates if it was already added by the loop
                missing_essential_headers = list(set(missing_essential_headers))

            if missing_essential_headers:
                return Response(
                    {
                        "error": "Missing essential CSV headers for processing.",
                        "missing_headers": missing_essential_headers,
                        "provided_headers": reader.fieldnames,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            successfully_processed_count = 0
            errors = []
            created_products_log = []
            updated_products_log = []

            for row_number, row_data in enumerate(reader, start=2):
                row = {
                    (k.strip().lower() if k else k): (v.strip() if v else v)
                    for k, v in row_data.items()
                }

                product_name_csv = row.get("name")
                price_str = row.get("price")
                category_name_csv = row.get("category name")
                description = row.get("description", "")
                barcode = row.get("barcode")
                is_grocery_item_str = row.get("is grocery item", "false")
                inventory_quantity_str = row.get("inventory quantity", "0")
                # product_id_csv = row.get("id") # ID is read but will be ignored for lookup

                # --- Name is now mandatory for each row ---
                if not product_name_csv:
                    errors.append(
                        {
                            "row": row_number,
                            "error": "Missing 'Name'. Product name is required to identify or create products.",
                        }
                    )
                    continue

                # Price validation
                if price_str is None:
                    errors.append(
                        {
                            "row": row_number,
                            "product_name": product_name_csv,
                            "error": "Missing 'Price'.",
                        }
                    )
                    continue
                try:
                    price = float(price_str)
                    if price < 0:
                        errors.append(
                            {
                                "row": row_number,
                                "product_name": product_name_csv,
                                "error": "Price cannot be negative.",
                            }
                        )
                        continue
                except ValueError:
                    errors.append(
                        {
                            "row": row_number,
                            "product_name": product_name_csv,
                            "error": "'Price' must be a valid number.",
                        }
                    )
                    continue

                # Inventory quantity validation
                try:
                    inventory_quantity = int(inventory_quantity_str)
                    if inventory_quantity < 0:
                        errors.append(
                            {
                                "row": row_number,
                                "product_name": product_name_csv,
                                "error": "Inventory quantity cannot be negative.",
                            }
                        )
                        continue
                except ValueError:
                    errors.append(
                        {
                            "row": row_number,
                            "product_name": product_name_csv,
                            "error": "'Inventory Quantity' must be an integer.",
                        }
                    )
                    continue

                is_grocery_item = is_grocery_item_str.lower() == "true"

                category_instance = None
                if (
                    category_name_csv
                    and category_name_csv.lower() != "n/a"
                    and category_name_csv.strip()
                ):
                    try:
                        category_instance, category_created = (
                            Category.objects.get_or_create(
                                name__iexact=category_name_csv.strip(),
                                defaults={"name": category_name_csv.strip()},
                            )
                        )
                        if category_created:
                            logger.info(
                                f"User {request.user.username} auto-created category '{category_instance.name}' from CSV import (row {row_number})."
                            )
                    except Exception as e:
                        logger.error(
                            f"Error processing category '{category_name_csv}' for product '{product_name_csv}' at row {row_number}: {str(e)}"
                        )
                        errors.append(
                            {
                                "row": row_number,
                                "product_name": product_name_csv,
                                "error": f"Error with category '{category_name_csv}': {str(e)}",
                            }
                        )
                        continue

                # Prepare product_payload based on your Product model.
                # 'name' itself will be used for lookup by update_or_create,
                # but also needs to be in defaults to handle potential case updates.
                product_payload = {
                    "name": product_name_csv,  # Ensure name from CSV is used for creation/update
                    "price": price,
                    "category": category_instance,
                    "description": description,
                    "barcode": barcode if barcode else None,
                    "is_grocery_item": is_grocery_item,
                    "inventory_quantity": inventory_quantity,
                }

                try:
                    # Always use name (case-insensitive) to find and update, or create.
                    # The 'ID' column from CSV is effectively ignored for matching.
                    product_instance, created = Product.objects.update_or_create(
                        name__iexact=product_name_csv,  # Case-insensitive lookup by name
                        defaults=product_payload,
                    )

                    log_action = "created_by_name" if created else "updated_by_name"
                    if created:
                        created_products_log.append(
                            {
                                "id": product_instance.id,
                                "name": product_instance.name,
                                "action": log_action,
                            }
                        )
                        logger.info(
                            f"User {request.user.username} created product '{product_instance.name}' (ID: {product_instance.id}) via CSV import (row {row_number})."
                        )
                    else:
                        updated_products_log.append(
                            {
                                "id": product_instance.id,
                                "name": product_instance.name,
                                "action": log_action,
                            }
                        )
                        logger.info(
                            f"User {request.user.username} updated product by name '{product_instance.name}' (ID: {product_instance.id}) via CSV import (row {row_number})."
                        )

                    successfully_processed_count += 1

                except Exception as e:
                    logger.error(
                        f"Error saving/updating product '{product_name_csv}' at row {row_number} for user {request.user.username}: {str(e)}"
                    )
                    errors.append(
                        {
                            "row": row_number,
                            "product_name": product_name_csv,
                            "error": f"Database error: {str(e)}",
                        }
                    )

            # --- Response Handling ---
            if errors and not (created_products_log or updated_products_log):
                return Response(
                    {
                        "message": "Product import failed. See errors.",
                        "created_count": 0,
                        "updated_count": 0,
                        "errors": errors,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if errors:
                return Response(
                    {
                        "message": "Product import partially successful.",
                        "created_count": len(created_products_log),
                        "updated_count": len(updated_products_log),
                        "created_products": created_products_log,
                        "updated_products": updated_products_log,
                        "errors": errors,
                    },
                    status=status.HTTP_207_MULTI_STATUS,
                )

            return Response(
                {
                    "message": "Product import successful.",
                    "created_count": len(created_products_log),
                    "updated_count": len(updated_products_log),
                    "created_products": created_products_log,
                    "updated_products": updated_products_log,
                },
                status=status.HTTP_200_OK,
            )

        except UnicodeDecodeError:
            return Response(
                {
                    "error": "Failed to decode CSV file. Please ensure it is UTF-8 encoded."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except csv.Error as e:
            return Response(
                {"error": f"Invalid CSV format: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(
                f"General error during CSV import for user {request.user.username}: {str(e)}"
            )
            return Response(
                {"error": f"An unexpected error occurred during import: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
