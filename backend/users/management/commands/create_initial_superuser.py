# /backend/users/management/commands/create_initial_superuser.py

import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = (
        "Create a superuser if none exists, using environment variables for credentials"
    )

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")

        if not all([username, email, password]):
            self.stdout.write(
                self.style.WARNING(
                    "Superuser credentials (DJANGO_SUPERUSER_USERNAME, DJANGO_SUPERUSER_EMAIL, "
                    "DJANGO_SUPERUSER_PASSWORD) are not fully set in environment variables. Skipping superuser creation."
                )
            )
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.SUCCESS(
                    f"Superuser '{username}' already exists. Skipping creation."
                )
            )
        else:
            self.stdout.write(f"Creating superuser '{username}'...")
            try:
                User.objects.create_superuser(
                    username=username, email=email, password=password
                )
                self.stdout.write(
                    self.style.SUCCESS(f"Superuser '{username}' created successfully.")
                )
            except Exception as e:
                self.stderr.write(
                    self.style.ERROR(f"Error creating superuser '{username}': {e}")
                )
