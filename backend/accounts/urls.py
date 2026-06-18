from django.urls import path
from .views import RequestOTPView, VerifyOTPView, WholesalerRegistrationView

urlpatterns = [
    path('auth/register/', RequestOTPView.as_view(), name='request-otp'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('wholesaler/register/', WholesalerRegistrationView.as_view())
]