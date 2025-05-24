# backend/users/admin_views.py
import os
from django.contrib import admin, messages
from django.urls import reverse
from django.http import HttpResponseRedirect
from django.core.management import call_command, CommandError
from django.conf import settings
from django.shortcuts import render
from django.contrib.auth.decorators import user_passes_test


def can_reset_database(user):
    allow_reset_env_var = os.environ.get("ALLOW_PRE_LAUNCH_DATABASE_RESET", "False")
    return user.is_superuser and (
        settings.DEBUG or allow_reset_env_var.lower() == "true"
    )


@user_passes_test(
    can_reset_database, login_url="/admin/login/"
)  # Or reverse_lazy('admin:login')
def reset_database_view(request):
    allow_reset_env_var_is_true = (
        os.environ.get("ALLOW_PRE_LAUNCH_DATABASE_RESET", "False").lower() == "true"
    )

    if request.method == "POST":
        if "confirm_reset_checkbox" in request.POST:
            try:
                # Pass the --force-run option to the management command
                # For boolean options added with action='store_true', you pass them as True
                call_command("reset_database_schema", force_run=True)
                messages.success(
                    request,
                    (
                        "Database reset process initiated successfully by the admin view. "
                        "This may take some time. Check server logs for detailed progress. "
                        "You might need to restart the server and log in again if sessions were cleared."
                    ),
                )
            except CommandError as e:  # Catch CommandError from the management command
                messages.error(request, f"Database Reset Command Error: {e}")
            except Exception as e:
                messages.error(
                    request, f"An unexpected error occurred during database reset: {e}"
                )
            return HttpResponseRedirect(reverse("admin:index"))
        else:
            messages.warning(
                request, "Reset was not confirmed using the checkbox on the form."
            )
            return HttpResponseRedirect(request.path)  # Stay on the confirmation page

    context = {
        **admin.site.each_context(request),
        "title": "Reset Database Schema",
        "is_debug": settings.DEBUG,
        "allow_reset_env_var_is_true": allow_reset_env_var_is_true,
        "has_permission": request.user.is_superuser,
    }
    return render(request, "admin/custom_actions/reset_database_form.html", context)
