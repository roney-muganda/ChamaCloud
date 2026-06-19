from django.urls import path
from .views import VerifyVoucherView, RedeemVoucherView

urlpatterns = [
    # Captures the voucher ID/code from the URL
    path('<str:code>/verify/', VerifyVoucherView.as_view(), name='verify-voucher'),
    path('<str:code>/redeem/', RedeemVoucherView.as_view(), name='redeem-voucher'),
]