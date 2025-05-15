# Example: backend/contact/views.py (or a suitable existing views.py)

from django.core.mail import send_mail, BadHeaderError
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny  # Allow anyone to use the contact form
import logging

logger = logging.getLogger(__name__)


class ContactFormView(APIView):
    """
    API View to handle contact form submissions from the website.
    """

    permission_classes = [AllowAny]  # Ensure this view is publicly accessible

    def post(self, request, *args, **kwargs):
        name = request.data.get("name")
        from_visitor_email = request.data.get("email")  # Visitor's email
        message = request.data.get("message")

        if not name or not from_visitor_email or not message:
            logger.warning("Contact form submission missing required fields.")
            return Response(
                {"error": "Please fill in all fields (Name, Email, Message)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subject = f"New Contact Form Submission from {name}"
        message_body = f"""
        You have received a new message from your website contact form:

        Name: {name}
        Email: {from_visitor_email}

        Message:
        {message}
        """
        # Use the default 'from' email set in settings
        from_email_server = settings.DEFAULT_FROM_EMAIL

        # !!! IMPORTANT: Set YOUR email address(es) here !!!
        # This is where the contact form message will be sent.
        recipient_list = ["contact@bakeajeen.com"]  # <--- CHANGE THIS

        # For testing, you might use the admin email from settings:
        # recipient_list = [admin_email[1] for admin_email in settings.ADMINS]
        # Or directly use your host user email if that's where you want it:
        # recipient_list = [settings.DJANGO_EMAIL_HOST_USER]

        try:
            send_mail(
                subject,
                message_body,
                from_email_server,
                recipient_list,
                # Optionally add visitor's email to reply-to header
                # headers={'Reply-To': from_visitor_email} # Check if Zoho respects this
            )
            logger.info(
                f"Contact email sent successfully from {from_visitor_email} to {recipient_list}"
            )
            return Response(
                {"success": "Message sent successfully!"}, status=status.HTTP_200_OK
            )
        except BadHeaderError:
            logger.error("Invalid header found in contact form submission.")
            return Response(
                {"error": "Invalid header found."}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # Catch broader SMTP errors or other issues
            logger.error(f"Error sending contact form email: {e}", exc_info=True)
            return Response(
                {
                    "error": "There was an error sending your message. Please try again later."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
