import os 
import random
import africastalking
from chamacloud.utils import normalize_phone

os.environ['NO_PROXY'] = '*'

from django.conf import settings
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_http_methods
from rest_framework.permissions import IsAuthenticated

User = get_user_model()

# Initialize Africa's Talking
africastalking.initialize(
    username=os.environ.get("AT_USERNAME", "sandbox"),
    api_key=os.environ.get("AT_API_KEY")
)
sms = africastalking.SMS

class RequestOTPView(APIView):
    """
    FR-V-001: Triggers a 4-digit OTP via Africa's Talking SMS.
    """
    def post(self, request):
        raw_phone = request.data.get("phone_number")
        if not raw_phone:
            return Response({"error": "Phone number is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Standardize the number right at the entry point
        phone_number = normalize_phone(raw_phone)
            
        # Generate a 4-digit OTP
        otp = str(random.randint(1000, 9999))
        
        # Cache OTP against normalized phone number for 5 minutes
        cache.set(f"otp_{phone_number}", otp, 300)
        
        # Send SMS via AT Sandbox
        message = f"Your Chama Cloud verification code is: {otp}. Valid for 5 minutes."
        
        try:
            # Sandbox requires numbers to be registered in your AT dashboard panel
            response = sms.send(message, [phone_number])
            return Response({
                "message": "OTP sent successfully via sandbox.",
                "debug_otp": otp 
            }, status=status.HTTP_200_OK)
        except Exception as e:
            # MVP DEVELOPMENT FALLBACK
            print(f"⚠️ SMS Bypassed: {str(e)}")
            return Response({
                "message": "Local SSL blocked SMS, but OTP was generated successfully.",
                "debug_otp": otp 
            }, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    """
    Verifies OTP and logs in / registers the user, returning access tokens.
    """
    def post(self, request):
        raw_phone = request.data.get("phone_number")
        user_otp = request.data.get("otp")
        
        if not raw_phone or not user_otp:
            return Response({"error": "Phone number and OTP are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Normalize the incoming login number to match database style
        phone_number = normalize_phone(raw_phone)
        username = request.data.get("username", phone_number) 
        
        cached_otp = cache.get(f"otp_{phone_number}")
        
        if cached_otp and cached_otp == str(user_otp):
            # Clear OTP immediately upon use
            cache.delete(f"otp_{phone_number}")
            
            # Get or create custom user based on normalized phone number
            user, created = User.objects.get_or_create(
                phone_number=phone_number,
                defaults={'username': username}
            )
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "Authenticated successfully",
                "is_new_user": created,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }, status=status.HTTP_200_OK)
            
        return Response({"error": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)

class WholesalerRegistrationView(APIView):
    """
    URL: /api/accounts/wholesaler/register/
    Allows an authenticated user to apply for a wholesaler account.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        
        # If they are already an approved wholesaler, prevent re-registration
        if user.is_approved_wholesaler:
            return Response({"message": "You are already an approved wholesaler."}, status=status.HTTP_400_BAD_REQUEST)

        business_name = request.data.get("business_name")
        business_location = request.data.get("business_location")

        if not business_name or not business_location:
            return Response({"error": "Business name and location are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Update user profile
        user.is_wholesaler = True
        user.business_name = business_name
        user.business_location = business_location
        user.save()

        return Response({
            "message": "Wholesaler application submitted successfully. Please wait for admin approval.",
            "status": "PENDING_APPROVAL"
        }, status=status.HTTP_200_OK)


@require_http_methods(["GET", "HEAD"])
def health_check(request):
    """FR-A-001: UptimeRobot health check endpoint."""
    if request.method == "HEAD":
        return HttpResponse(status=200)

    return JsonResponse({
        "status": "healthy", 
        "service": "chama-cloud-api",
        "version": "1.0.0"
    }, status=200)