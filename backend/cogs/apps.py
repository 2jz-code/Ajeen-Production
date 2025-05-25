from django.apps import AppConfig


class CogsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "cogs"

    def ready(self):
        import cogs.signals  # Import signals to ensure they're connected
