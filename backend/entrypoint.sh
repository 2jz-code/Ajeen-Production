#!/bin/sh

# entrypoint.sh

# Original entrypoint commands (e.g., waiting for DB, then starting supervisord)
echo "Waiting for database..."
# Assuming wait_for_db.py is executable and in the PATH or current directory
# Ensure APP_HOME is set if wait_for_db.py is in ${APP_HOME}
python ${APP_HOME}/wait_for_db.py # Or just python wait_for_db.py if WORKDIR is /app
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