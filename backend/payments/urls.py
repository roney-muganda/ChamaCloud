from django.urls import path
from .views import InitiateContributionView, DarajaCallbackView, ValidateVoucherView

urlpatterns = [
    path('pool/<int:pool_id>/contribute/', InitiateContributionView.as_view(), name='initiate-payment'),
    path('callback/', DarajaCallbackView.as_view(), name='daraja-callback'),
    path('webhook/', DarajaCallbackView.as_view(), name='daraja-webhook'),
    path('vouchers/<str:key>/', ValidateVoucherView.as_view(), name='validate-voucher'),
]