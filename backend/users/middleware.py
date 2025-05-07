# combined-project/backend/users/middleware.py

# Remove: from django.utils.deprecation import MiddlewareMixin
# MiddlewareMixin is not needed for modern Django middleware


class JWTMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        # One-time configuration and initialization.

    def __call__(self, request):
        # If the request path starts with '/admin/', bypass JWT cookie logic.
        # The Django admin uses its own session-based authentication.
        if request.path.startswith("/admin/"):
            # print(f"Admin path ({request.path}), bypassing JWT cookie to header logic.") # Optional debug
            return self.get_response(request)

        # Existing logic for non-admin paths
        # print(f"Path: {request.path}") # Optional debug
        # print(f"POS access token: {request.COOKIES.get('pos_access_token')}") # Optional debug
        # print(f"Website access token: {request.COOKIES.get('website_access_token')}") # Optional debug

        if "HTTP_AUTHORIZATION" not in request.META:
            # Check for website token first if path indicates a website API call
            if request.path.startswith("/api/website/"):
                access_token = request.COOKIES.get("website_access_token")
                if access_token:
                    # print(f"Setting website token for {request.path}") # Optional debug
                    request.META["HTTP_AUTHORIZATION"] = f"Bearer {access_token}"
            else:  # Fallback to POS token for other paths (e.g., general /api/ or /api/auth/)
                access_token = request.COOKIES.get("pos_access_token")
                if access_token:
                    # print(f"Setting POS token for {request.path}") # Optional debug
                    request.META["HTTP_AUTHORIZATION"] = f"Bearer {access_token}"

        response = self.get_response(request)
        return response
