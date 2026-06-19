from django.urls import path
from .views import VerifyVoucherView, RedeemVoucherView, VendorVoucherListView

urlpatterns = [
    # Captures the voucher ID/code from the URL
    path('my-vouchers/', VendorVoucherListView.as_view(), name='my-vouchers'),
    path('<str:code>/verify/', VerifyVoucherView.as_view(), name='verify-voucher'),
    path('<str:code>/redeem/', RedeemVoucherView.as_view(), name='redeem-voucher'),
]