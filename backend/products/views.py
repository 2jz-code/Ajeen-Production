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
