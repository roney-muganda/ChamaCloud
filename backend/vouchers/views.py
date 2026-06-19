import re
import uuid
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from payments.models import QRVoucher

class VerifyVoucherView(APIView):
    """
    GET /api/vouchers/<code>/verify/
    Looks up a voucher by its fallback_code or UUID and returns details.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, code):
        if not getattr(request.user, 'is_approved_wholesaler', False):
            return Response(
                {"error": "Access denied. Only approved wholesalers can scan vouchers."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # Secure lookup supporting exact code, VOUCHER-prefix, or raw UUID
        query = Q(fallback_code=code)
        match = re.search(r'\d+', str(code))
        if match:
            query |= Q(fallback_code=match.group())

        try:
            valid_uuid = uuid.UUID(str(code))
            query |= Q(id=valid_uuid)
        except ValueError:
            pass 

        voucher = QRVoucher.objects.filter(query).first()

        if not voucher:
            return Response(
                {"error": "Voucher not found or invalid."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Trigger your model's built-in expiry check
        voucher.is_valid()

        group_name = voucher.pool.group.name if getattr(voucher, 'pool', None) else "Chama Group"
        
        # Map your model's 'AVAILABLE' state to the frontend's 'ACTIVE' styling
        frontend_status = "ACTIVE" if voucher.status == 'AVAILABLE' else voucher.status

        return Response({
            "code": voucher.fallback_code,
            "amount": voucher.amount,
            "group_name": group_name,
            "vendor_name": voucher.vendor.username if voucher.vendor else "Vendor",
            "status": frontend_status,
            "created_at": voucher.created_at.strftime("%b %d, %Y %H:%M")
        }, status=status.HTTP_200_OK)


class RedeemVoucherView(APIView):
    """
    POST /api/vouchers/<code>/redeem/
    Marks an AVAILABLE voucher as REDEEMED.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        if not getattr(request.user, 'is_approved_wholesaler', False):
            return Response(
                {"error": "Access denied. Only approved wholesalers can redeem vouchers."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        query = Q(fallback_code=code)
        match = re.search(r'\d+', str(code))
        if match:
            query |= Q(fallback_code=match.group())

        try:
            valid_uuid = uuid.UUID(str(code))
            query |= Q(id=valid_uuid)
        except ValueError:
            pass 
        
        voucher = QRVoucher.objects.filter(query).first()

        if not voucher:
            return Response(
                {"error": "Voucher not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Use your model's built-in logic to ensure it hasn't expired or been used
        if not voucher.is_valid() or voucher.status != 'AVAILABLE':
            return Response(
                {"error": f"This voucher cannot be redeemed. Current status is {voucher.status}."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Flip the explicit status field
        voucher.status = 'REDEEMED'
        voucher.save()

        return Response({
            "message": "Payment complete! Goods can now be released.",
            "amount": voucher.amount
        }, status=status.HTTP_200_OK)


class VendorVoucherListView(APIView):
    """
    GET /api/vouchers/my-vouchers/
    Returns all vouchers for the authenticated vendor's UI Wallet.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # We can query the vendor directly since your model explicitly links it!
        vouchers = QRVoucher.objects.filter(vendor=request.user).order_by('-created_at')

        data = []
        for v in vouchers:
            # Trigger expiry check quietly before sending data to UI
            v.is_valid()
            
            group_name = v.pool.group.name if getattr(v, 'pool', None) else "Chama Group"
            frontend_status = "ACTIVE" if v.status == 'AVAILABLE' else v.status

            data.append({
                "id": str(v.id),
                "code": v.fallback_code,
                "amount": v.amount,
                "status": frontend_status,
                "group_name": group_name,
                "created_at": v.created_at.strftime("%b %d, %Y")
            })

        return Response(data, status=status.HTTP_200_OK)