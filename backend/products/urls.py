# backend/products/urls.py
from django.urls import path
from .views import (
    ProductList,
    ProductDetail,
    CategoryList,
    CategoryDetail,
    ProductByBarcodeView,
    ProductRestockView,
    ProductExportCSVView,
)

urlpatterns = [
    path("products/categories/", CategoryList.as_view(), name="category-list"),
    path(
        "products/categories/<int:pk>/",
        CategoryDetail.as_view(),
        name="category-detail",
    ),
    path(
        "products/", ProductList.as_view(), name="product-list-create"
    ),  # Consistent naming with previous suggestion
    path(
        "products/by-barcode/",
        ProductByBarcodeView.as_view(),
        name="product-by-barcode",
    ),
    # Specific routes first
    path(
        "products/restock/",
        ProductRestockView.as_view(),
        name="product-restock",  # Correct name for the route
    ),
    path(  # Add new path for CSV export
        "products/export-csv/",
        ProductExportCSVView.as_view(),
        name="product-export-csv",
    ),
    # General route (with <str:name>) last for this group
    path("products/<str:name>/", ProductDetail.as_view(), name="product-detail"),
]
