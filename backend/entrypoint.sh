#!/bin/sh

# entrypoint.sh

# --- BEGIN DEBUGGING PGSSL* VARIABLES ---
echo "--- Checking PGSSL* Environment Variables ---"
echo "PGAPPNAME: $PGAPPNAME"
echo "PGCLIENTENCODING: $PGCLIENTENCODING"
echo "PGCONNECT_TIMEOUT: $PGCONNECT_TIMEOUT"
echo "PGDATABASE: $PGDATABASE"
echo "PGDATASTYLE: $PGDATASTYLE"
echo "PGDATESTYLE: $PGDATESTYLE" # Corrected from PGDATASTYLE
echo "PGHOST: $PGHOST"
echo "PGHOSTADDR: $PGHOSTADDR"
echo "PGKRBSRVNAME: $PGKRBSRVNAME"
echo "PGOPTIONS: $PGOPTIONS"
echo "PGPASSFILE: $PGPASSFILE"
echo "PGPASSWORD: $PGPASSWORD" # Be cautious if this logs sensitive data
echo "PGPORT: $PGPORT"
echo "PGREQUIRESSL: $PGREQUIRESSL"
echo "PGSERVICE: $PGSERVICE"
echo "PGSERVICEFILE: $PGSERVICEFILE"
echo "PGSESSIONENCODING: $PGSESSIONENCODING" # Not a standard libpq env var
echo "PGSSLAPPLICATIONNAME: $PGSSLAPPLICATIONNAME" # Not a standard libpq env var
echo "PGSSLCERT: $PGSSLCERT"
echo "PGSSLCOMPRESSION: $PGSSLCOMPRESSION"
echo "PGSSLCRL: $PGSSLCRL"
echo "PGSSLCRLFILE: $PGSSLCRLFILE" # Corrected from PGSSLCRL
echo "PGSSLKEY: $PGSSLKEY"
echo "PGSSLMAXPROTOCOL: $PGSSLMAXPROTOCOL"
echo "PGSSLMINPROTOCOL: $PGSSLMINPROTOCOL"
echo "PGSSLMODE: $PGSSLMODE" # Very important
echo "PGSSLROOTCERT: $PGSSLROOTCERT" # Very important
echo "PGTARGETSESSIONATTRS: $PGTARGETSESSIONATTRS"
echo "PGTZ: $PGTZ"
echo "PGUSER: $PGUSER"
echo "-----------------------------------------"
# --- END DEBUGGING PGSSL* VARIABLES ---
# --- BEGIN CHECKING CA BUNDLE FILE ---
echo "--- Checking CA bundle file (/app/certs/global-bundle.pem) ---"
if [ -f "/app/certs/global-bundle.pem" ]; then
    echo "File /app/certs/global-bundle.pem exists."
    ls -l /app/certs/global-bundle.pem
    echo "Attempting to read first line as app_user:"
    # Use su-exec or gosu if available for cleaner user switching, otherwise try su
    # Ensure app_user has a valid shell or use -s /bin/sh
    # If su is problematic, this check might need to be adapted or done via a Python script run as app_user
    if su app_user -s /bin/sh -c "head -n 1 /app/certs/global-bundle.pem > /dev/null"; then
        echo "Successfully read by app_user (first line)."
    else
        echo "ERROR: Failed to read by app_user (first line). Exit code: $?"
    fi
else
    echo "ERROR: File /app/certs/global-bundle.pem does NOT exist."
fi
echo "----------------------------------------------------------"
# --- END CHECKING CA BUNDLE FILE ---
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