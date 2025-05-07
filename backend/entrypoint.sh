#!/bin/sh

# /backend/entrypoint.sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate --noinput

# Now execute the main command (CMD) passed to this entrypoint script.
# In our Dockerfile, this will be the command to start supervisord.
exec "$@"