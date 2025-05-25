# pos_and_backend/backend/cogs/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UnitOfMeasureViewSet,
    InventoryItemViewSet,
    RecipeViewSet,
    ProductCOGSViewSet,
    ExportAllCogsDataView,
    ImportAllCogsDataView,
)

router = DefaultRouter()
router.register(r"units-of-measure", UnitOfMeasureViewSet)
router.register(r"inventory-items", InventoryItemViewSet)
router.register(r"recipes", RecipeViewSet)
router.register(r"product-cogs", ProductCOGSViewSet)

urlpatterns = [
    path("", include(router.urls)),
    # Add the path for ExportAllCogsDataView directly here:
    path(
        "export-all-cogs/", ExportAllCogsDataView.as_view(), name="export_all_cogs_data"
    ),
    path(
        "import-all-cogs/", ImportAllCogsDataView.as_view(), name="import_all_cogs_data"
    ),  # Added
]
