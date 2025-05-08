#!/bin/sh
# /backend/entrypoint.sh (Production Ready with Python DB Wait & Superuser Creation)

set -e

# --- Database Wait Logic ---
echo "Waiting for database to be ready (using Python script)..."
python "${APP_HOME}/wait_for_db.py" # Assumes APP_HOME is set correctly
echo "Database is ready!"
# --- End Database Wait Logic ---

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate --noinput

# Create initial superuser if credentials are provided and user doesn't exist
echo "Checking for initial superuser..."
python manage.py create_initial_superuser # Run our custom command

# Execute the main command (CMD) passed to this entrypoint script.
echo "Executing CMD: $@"
exec "$@"