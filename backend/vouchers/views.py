from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import QRVoucher

class VerifyVoucherView(APIView):
    """
    GET /api/vouchers/<code>/verify/
    Looks up a voucher by its unique code and returns the details.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, code):
        # SECURITY GATE: Only approved wholesalers can verify vouchers
        if not getattr(request.user, 'is_approved_wholesaler', False):
            return Response(
                {"error": "Access denied. Only approved wholesalers can scan vouchers."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # Find the voucher (returns 404 automatically if it doesn't exist)
        voucher = get_object_or_404(QRVoucher, code=code)

        # Safely extract related data (assuming your QRVoucher is linked to a pool/group)
        group_name = voucher.pool.group.name if hasattr(voucher, 'pool') and hasattr(voucher.pool, 'group') else "Chama Group"
        vendor_name = voucher.pool.group.admin.username if hasattr(voucher, 'pool') and hasattr(voucher.pool.group, 'admin') else "Admin"

        return Response({
            "code": voucher.code,
            "amount": voucher.amount,
            "group_name": group_name,
            "vendor_name": vendor_name,
            "status": voucher.status,
            "created_at": voucher.created_at.strftime("%Y-%m-%d %H:%M")
        }, status=status.HTTP_200_OK)


class RedeemVoucherView(APIView):
    """
    POST /api/vouchers/<code>/redeem/
    Marks an ACTIVE voucher as REDEEMED and associates it with the wholesaler.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        # SECURITY GATE: Only approved wholesalers can redeem vouchers
        if not getattr(request.user, 'is_approved_wholesaler', False):
            return Response(
                {"error": "Access denied. Only approved wholesalers can redeem vouchers."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        voucher = get_object_or_404(QRVoucher, code=code)

        # State machine check: Prevent double-spending
        if voucher.status != 'ACTIVE':
            return Response(
                {"error": f"This voucher cannot be redeemed. It is currently marked as {voucher.status}."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Flip the status
        voucher.status = 'REDEEMED'
        
        # Optional but highly recommended: Log exactly who redeemed it
        if hasattr(voucher, 'redeemed_by_id'):
            voucher.redeemed_by = request.user.wholesaler

        voucher.save()

        # NOTE: If you have a 'wallet' or 'pending_payout' field on your Wholesaler model, 
        # you would add `voucher.amount` to it right here before returning the response!

        return Response({
            "message": "Payment complete! Goods can now be released.",
            "amount": voucher.amount
        }, status=status.HTTP_200_OK)