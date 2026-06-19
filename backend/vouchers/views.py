import re
from django.utils import timezone
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

# CRITICAL FIX: Importing the correct model from the payments app!
from payments.models import QRVoucher

class VerifyVoucherView(APIView):
    """
    GET /api/vouchers/<code>/verify/
    Looks up a voucher by its fallback_code or ID and returns details.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, code):
        # SECURITY GATE: Only approved wholesalers can verify vouchers
        if not getattr(request.user, 'is_approved_wholesaler', False):
            return Response(
                {"error": "Access denied. Only approved wholesalers can scan vouchers."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # Look up by the exact fallback_code, OR extract the ID if they entered "VOUCHER-12"
        query = Q(fallback_code=code)
        match = re.search(r'\d+', str(code))
        if match:
            query |= Q(id=match.group())
        
        # Filter and get the first matching voucher
        voucher = QRVoucher.objects.filter(query).first()

        if not voucher:
            return Response(
                {"error": "Voucher not found or invalid."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Safely map related fields (amount might be directly on voucher or via pool)
        amount = getattr(voucher, 'amount', getattr(voucher.pool, 'target_amount', 0) if hasattr(voucher, 'pool') else 0)
        
        group_name = "Chama Group"
        vendor_name = "Vendor"
        
        if getattr(voucher, 'pool', None) and getattr(voucher.pool, 'group', None):
            group_name = voucher.pool.group.name
            if getattr(voucher.pool.group, 'admin', None):
                vendor_name = voucher.pool.group.admin.username

        # Map 'is_claimed' to the frontend's 'status' string expectation
        status_label = "REDEEMED" if voucher.is_claimed else "ACTIVE"

        # Use fallback_code if it exists, otherwise generate a display code
        display_code = getattr(voucher, 'fallback_code', f"VOUCHER-{voucher.id}")

        return Response({
            "code": display_code,
            "amount": amount,
            "group_name": group_name,
            "vendor_name": vendor_name,
            "status": status_label,
            "created_at": voucher.created_at.strftime("%Y-%m-%d %H:%M")
        }, status=status.HTTP_200_OK)


class RedeemVoucherView(APIView):
    """
    POST /api/vouchers/<code>/redeem/
    Marks an ACTIVE voucher as claimed and records the wholesaler who processed it.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        # SECURITY GATE: Only approved wholesalers can redeem vouchers
        if not getattr(request.user, 'is_approved_wholesaler', False):
            return Response(
                {"error": "Access denied. Only approved wholesalers can redeem vouchers."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # Look up by fallback_code or extracted ID
        query = Q(fallback_code=code)
        match = re.search(r'\d+', str(code))
        if match:
            query |= Q(id=match.group())
        
        voucher = QRVoucher.objects.filter(query).first()

        if not voucher:
            return Response(
                {"error": "Voucher not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # State machine check using the actual 'is_claimed' boolean
        if voucher.is_claimed:
            return Response(
                {"error": "This voucher has already been redeemed."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Flip the status and record the wholesaler
        voucher.is_claimed = True
        voucher.claimed_by = request.user
        voucher.claimed_at = timezone.now()
        voucher.save()

        # Get the amount
        amount = getattr(voucher, 'amount', getattr(voucher.pool, 'target_amount', 0) if hasattr(voucher, 'pool') else 0)

        return Response({
            "message": "Payment complete! Goods can now be released.",
            "amount": amount
        }, status=status.HTTP_200_OK)