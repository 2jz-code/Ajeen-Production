"""
URL configuration for ajeenPOS project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from . import views  # Import your views
from users import admin_views as users_custom_admin_views

# --- Start: Admin URL Patching ---
# Ensure this runs only once
if not hasattr(admin.site, "_custom_urls_added"):
    print("Attempting to patch admin.site.get_urls for custom view...")
    original_admin_get_urls_func = admin.site.get_urls

    def get_custom_admin_urls():
        print("--- CUSTOM get_custom_admin_urls being EXECUTED ---")
        # These are the URLs you want to add to the admin
        custom_urlpatterns = [
            path(
                "reset-database-schema/",  # Path relative to /admin/
                admin.site.admin_view(users_custom_admin_views.reset_database_view),
                name="admin_reset_database_schema",
            ),
        ]
        return custom_urlpatterns + original_admin_get_urls_func()

    admin.site.get_urls = get_custom_admin_urls
    admin.site._custom_urls_added = True  # Mark as patched
    print("admin.site.get_urls has been patched.")
# --- End: Admin URL Patching ---


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("users.urls")),
    path("api/", include("users.urls_website")),
    path("api/", include("products.urls")),
    path("api/website/", include("products.urls_website")),
    path("api/", include("orders.urls")),
    path("api/website/", include("orders.urls_website")),
    path("api/reports/", include("reports.urls")),
    path("api/hardware/", include("hardware.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/settings/", include("settings.urls")),
    path("api/rewards/", include("rewards.urls")),
    path("api/discounts/", include("discounts.urls")),
    path("api/website/rewards/", include("rewards.urls")),
    path("api/", include("users.urls_mobile")),
    path("api/", include("contact.urls")),
    path("health/", views.health_check, name="health-check"),
    path("api/cogs/", include("cogs.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
