import os 
import random
import africastalking


os.environ['NO_PROXY'] = '*'

from django.conf import settings
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.http import JsonResponse

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
        phone_number = request.data.get("phone_number")
        if not phone_number:
            return Response({"error": "Phone number is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Generate a 4-digit OTP
        otp = str(random.randint(1000, 9999))
        
        # Cache OTP against phone number for 5 minutes (300 seconds)
        cache.set(f"otp_{phone_number}", otp, 300)
        
        # Send SMS via AT Sandbox
        message = f"Your Chama Cloud verification code is: {otp}. Valid for 5 minutes."
        
        try:
            # Note: Sandbox requires numbers to be registered in your AT dashboard panel
            response = sms.send(message, [phone_number])
            return Response({
                "message": "OTP sent successfully via sandbox.",
                "debug_otp": otp # Surfaced for easy development testing
            }, status=status.HTTP_200_OK)
        except Exception as e:
            # MVP DEVELOPMENT FALLBACK: 
            # If local Windows SSL blocks the SMS, don't crash. 
            # Just return the OTP to the terminal so we can keep building!
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
        phone_number = request.data.get("phone_number")
        user_otp = request.data.get("otp")
        username = request.data.get("username", phone_number) # Fallback for base user requirement
        
        if not phone_number or not user_otp:
            return Response({"error": "Phone number and OTP are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        cached_otp = cache.get(f"otp_{phone_number}")
        
        if cached_otp and cached_otp == str(user_otp):
            # Clear OTP immediately upon use
            cache.delete(f"otp_{phone_number}")
            
            # Get or create custom user based on phone number
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

def health_check(request):
    """FR-A-001: UptimeRobot health check endpoint."""
    return JsonResponse({
        "status": "healthy", 
        "service": "chama-cloud-api",
        "version": "1.0.0"
    }, status=200)