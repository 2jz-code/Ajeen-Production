from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
import logging  # Import logging

logger = logging.getLogger(__name__)  # Get a logger for the current module


@csrf_exempt
def health_check(request):
    logger.info("Health check endpoint hit!")  # Add this log line
    # You could add more detailed checks here if needed later
    # e.g., try: from django.db import connection; connection.cursor()
    # except Exception as e: logger.error(f"Health check DB failed: {e}"); return HttpResponse("DB Error", status=503)
    return HttpResponse("OK", status=200, content_type="text/plain")
