from django.urls import path
from .views import RequestOTPView, VerifyOTPView, WholesalerRegistrationView, WholesalerApplicationView, CurrentUserView

urlpatterns = [
    path('auth/register/', RequestOTPView.as_view(), name='request-otp'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('wholesaler/register/', WholesalerRegistrationView.as_view()),
    path('wholesalers/apply/', WholesalerApplicationView.as_view()),
    path('auth/users/me/', CurrentUserView.as_view(), name='current-user'),
]