# backend/users/management/commands/reset_database_schema.py
import os
from django.core.management.base import BaseCommand, CommandError
from django.core.management import call_command
from django.db import connection, transaction, OperationalError
from django.conf import settings
from django.apps import apps


class Command(BaseCommand):
    help = (
        "Drops all database tables/schema, reruns migrations, and creates a superuser. "
        "USE WITH EXTREME CAUTION. Controlled by ALLOW_PRE_LAUNCH_DATABASE_RESET env var and --force-run flag."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--force-run",
            action="store_true",
            help="Force run without interactive console confirmation (intended for use by admin view).",
        )

    def handle(self, *args, **options):
        allow_reset_env_var = os.environ.get("ALLOW_PRE_LAUNCH_DATABASE_RESET", "False")
        force_run_option = options["force_run"]

        if not (settings.DEBUG or allow_reset_env_var.lower() == "true"):
            raise CommandError(
                "This command is highly destructive. "
                "It will only run if settings.DEBUG is True OR "
                "the ALLOW_PRE_LAUNCH_DATABASE_RESET environment variable is set to 'true'."
            )

        if not force_run_option:
            confirmation = input(
                self.style.WARNING(
                    "WARNING: This command will WIPE your current database schema and data, "
                    "then reapply migrations.\nThis is a DESTRUCTIVE operation and data will be lost. "
                    "ARE YOU ABSOLUTELY SURE you want to proceed? (yes/no): "
                )
            )
            if confirmation.lower() != "yes":
                self.stdout.write(
                    self.style.NOTICE("Database reset cancelled by user (console).")
                )
                return
        else:
            self.stdout.write(
                self.style.WARNING(
                    "Running with --force-run: Bypassing console input confirmation. "
                    "The admin form checkbox served as the web UI confirmation."
                )
            )

        self.stdout.write(self.style.WARNING("Proceeding with database reset..."))

        try:
            # Terminate other connections for PostgreSQL
            if connection.vendor == "postgresql":
                self.stdout.write(
                    self.style.NOTICE(
                        "Attempting to close other PostgreSQL connections to the database..."
                    )
                )
                try:
                    with connection.cursor() as cursor:
                        db_name = settings.DATABASES["default"]["NAME"]
                        # This query attempts to terminate other connections to the current database.
                        # Requires appropriate database user privileges.
                        cursor.execute(
                            f"""
                            SELECT pg_terminate_backend(pg_stat_activity.pid)
                            FROM pg_stat_activity
                            WHERE pg_stat_activity.datname = %s
                              AND pid <> pg_backend_pid();
                        """,
                            [db_name],
                        )
                    self.stdout.write(
                        self.style.SUCCESS(
                            "Successfully attempted to terminate other connections."
                        )
                    )
                except OperationalError as oe:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Could not terminate other connections (this might be due to permissions or no other connections): {oe}"
                        )
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Unexpected error trying to terminate connections: {e}"
                        )
                    )

            # Dropping schema/tables
            if connection.vendor == "postgresql":
                with connection.cursor() as cursor:
                    self.stdout.write(
                        self.style.NOTICE(
                            "For PostgreSQL, dropping and recreating 'public' schema."
                        )
                    )
                    cursor.execute("DROP SCHEMA public CASCADE;")
                    cursor.execute("CREATE SCHEMA public;")
                    db_user = settings.DATABASES["default"].get("USER")
                    if db_user:
                        cursor.execute(
                            f"GRANT ALL ON SCHEMA public TO {connection.ops.quote_name(db_user)};"
                        )
                    cursor.execute(
                        f"GRANT ALL ON SCHEMA public TO public;"
                    )  # Standard grant
                self.stdout.write(
                    self.style.SUCCESS(
                        "PostgreSQL 'public' schema dropped and recreated."
                    )
                )
            elif connection.vendor == "sqlite":
                self.stdout.write(
                    self.style.NOTICE(
                        "For SQLite, using 'flush' to clear data. For a full schema reset from old migrations, delete the DB file manually if needed before running this."
                    )
                )
                call_command("flush", "--noinput", interactive=False)
            elif connection.vendor == "mysql":
                with connection.cursor() as cursor:
                    self.stdout.write(
                        self.style.NOTICE("For MySQL, dropping all tables.")
                    )
                    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
                    all_tables = connection.introspection.table_names(cursor)
                    for table_name in all_tables:
                        self.stdout.write(f"Dropping table: {table_name}")
                        cursor.execute(
                            f"DROP TABLE IF EXISTS {connection.ops.quote_name(table_name)};"
                        )
                    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
                self.stdout.write(self.style.SUCCESS("MySQL tables dropped."))
            else:  # Generic attempt for other DBs
                with transaction.atomic():  # Use transaction for iterative drop
                    with connection.cursor() as cursor:
                        self.stdout.write(
                            self.style.WARNING(
                                f"Generic table drop for DB vendor: {connection.vendor}. This might be unreliable."
                            )
                        )
                        all_tables = connection.introspection.table_names(cursor)
                        tables_to_drop = [
                            t for t in all_tables if t != "django_migrations"
                        ]
                        try:
                            for (
                                seq
                            ) in (
                                connection.introspection.sequence_list()
                            ):  # For DBs that use sequences
                                cursor.execute(
                                    f"DROP SEQUENCE IF EXISTS {connection.ops.quote_name(seq['name'])} CASCADE;"
                                )
                        except Exception as seq_e:
                            self.stdout.write(
                                self.style.WARNING(
                                    f"Could not drop sequences (normal for some DBs): {seq_e}"
                                )
                            )

                        for table_name in reversed(
                            tables_to_drop
                        ):  # Drop in reverse to help with FKs
                            try:
                                cursor.execute(
                                    f"DROP TABLE IF EXISTS {connection.ops.quote_name(table_name)} CASCADE;"
                                )
                                self.stdout.write(
                                    self.style.SUCCESS(f"Dropped table {table_name}")
                                )
                            except Exception as e:
                                self.stdout.write(
                                    self.style.WARNING(
                                        f"Could not drop table {table_name}: {e}"
                                    )
                                )
                        try:
                            cursor.execute(
                                f"DROP TABLE IF EXISTS {connection.ops.quote_name('django_migrations')} CASCADE;"
                            )
                            self.stdout.write(
                                self.style.SUCCESS("Dropped table django_migrations")
                            )
                        except Exception as e:
                            self.stdout.write(
                                self.style.WARNING(
                                    f"Could not drop table django_migrations: {e}"
                                )
                            )
            self.stdout.write(
                self.style.SUCCESS("Database schema operations completed.")
            )

            self.stdout.write(self.style.WARNING("Running migrations..."))
            call_command(
                "migrate", interactive=False
            )  # interactive=False should translate to --noinput
            self.stdout.write(self.style.SUCCESS("Migrations applied successfully."))

            self.stdout.write(
                self.style.WARNING("Checking/Creating initial superuser...")
            )
            # REMOVE interactive=False from create_initial_superuser as it doesn't support it
            call_command("create_initial_superuser")
            self.stdout.write(self.style.SUCCESS("Superuser check/creation complete."))

            self.stdout.write(
                self.style.SUCCESS(
                    "Database reset and migration process finished successfully! 🎉"
                )
            )

        except Exception as e:
            self.stderr.write(
                self.style.ERROR(f"An error occurred during database reset: {e}")
            )
            import traceback

            traceback.print_exc()
            raise CommandError(f"Database reset failed: {e}")
