import re
import uuid
from django.utils import timezone
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

        # 1. Base query: Check exact fallback code
        query = Q(fallback_code=code)
        
        # 2. If they typed "VOUCHER-123", extract "123" and check fallback code
        match = re.search(r'\d+', str(code))
        if match:
            query |= Q(fallback_code=match.group())

        # 3. SAFE UUID CHECK: Only query the 'id' field if the code is actually a valid UUID
        try:
            valid_uuid = uuid.UUID(str(code))
            query |= Q(id=valid_uuid)
        except ValueError:
            pass # Not a UUID, safely ignore

        voucher = QRVoucher.objects.filter(query).first()

        if not voucher:
            return Response(
                {"error": "Voucher not found or invalid."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        amount = getattr(voucher, 'amount', getattr(voucher.pool, 'target_amount', 0) if hasattr(voucher, 'pool') else 0)
        
        group_name = "Chama Group"
        vendor_name = "Vendor"
        
        if getattr(voucher, 'pool', None) and getattr(voucher.pool, 'group', None):
            group_name = voucher.pool.group.name
            if getattr(voucher.pool.group, 'admin', None):
                vendor_name = voucher.pool.group.admin.username

        status_label = "REDEEMED" if voucher.is_claimed else "ACTIVE"
        display_code = getattr(voucher, 'fallback_code', f"VOUCHER-{str(voucher.id)[:8]}")

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
    Marks an ACTIVE voucher as claimed.
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

        if voucher.is_claimed:
            return Response(
                {"error": "This voucher has already been redeemed."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        voucher.is_claimed = True
        voucher.claimed_by = request.user
        voucher.claimed_at = timezone.now()
        voucher.save()

        amount = getattr(voucher, 'amount', getattr(voucher.pool, 'target_amount', 0) if hasattr(voucher, 'pool') else 0)

        return Response({
            "message": "Payment complete! Goods can now be released.",
            "amount": amount
        }, status=status.HTTP_200_OK)

class VendorVoucherListView(APIView):
    """
    GET /api/vouchers/my-vouchers/
    Returns all vouchers (both ACTIVE and REDEEMED) for the authenticated vendor's groups.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Find all vouchers linked to pools where the user is a group member
        # Assuming QRVoucher is in the payments app based on our last fix
        from payments.models import QRVoucher 
        
        vouchers = QRVoucher.objects.filter(
            pool__group__members__vendor=request.user
        ).order_by('-created_at')

        data = []
        for v in vouchers:
            amount = getattr(v, 'amount', getattr(v.pool, 'target_amount', 0) if hasattr(v, 'pool') else 0)
            group_name = v.pool.group.name if getattr(v, 'pool', None) and getattr(v.pool, 'group', None) else "Chama Group"
            
            data.append({
                "id": str(v.id),
                "code": getattr(v, 'fallback_code', f"VOUCHER-{str(v.id)[:8]}"),
                "amount": amount,
                "status": "REDEEMED" if v.is_claimed else "ACTIVE",
                "group_name": group_name,
                "created_at": v.created_at.strftime("%b %d, %Y")
            })

        return Response(data, status=status.HTTP_200_OK)