import os
import requests
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
from django.contrib.auth import get_user_model
from chamacloud.utils import normalize_phone
from .models import MpesaPayment
from pools.models import Pool
from .mpesa import get_mpesa_access_token, generate_stk_password

User = get_user_model()

class InitiateContributionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pool_id):
        # 1. Fetch Pool & Validate Membership
        try:
            pool = Pool.objects.get(id=pool_id, group__members__vendor=request.user, status='OPEN')
        except Pool.DoesNotExist:
            return Response({"error": "Active pool not found or unauthorized."}, status=status.HTTP_404_NOT_FOUND)

        member_count = pool.group.members.count()
        if member_count == 0:
            return Response({"error": "Invalid group state: No members found."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Divide target by members and convert to integer
        amount = int(pool.target_amount / member_count)
        
        # Format the phone number. Safaricom requires 2547XXXXXXXX (No '+')
        phone_number = request.user.phone_number.replace('!', '').replace('+', '')
        
        # 2. Idempotency Check: Prevent duplicate processing if they are already PENDING
        existing_pending = MpesaPayment.objects.filter(
            pool=pool, 
            vendor=request.user, 
            status='PENDING'
        ).exists()
        
        if existing_pending:
            return Response({"error": "You already have a pending transaction. Please check your phone or wait a moment."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Prepare the Daraja Request
        access_token = get_mpesa_access_token()
        password, timestamp = generate_stk_password()
        shortcode = os.environ.get('DARAJA_BUSINESS_SHORTCODE')
        
        # Your live Render URL endpoint matching the URL configuration
        callback_url = "https://chamacloud-api.onrender.com/api/payments/webhook/"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,  # PRODUCTION CHANGE: Real calculated dynamic pool amount
            "PartyA": phone_number,
            "PartyB": shortcode,
            "PhoneNumber": phone_number,
            "CallBackURL": callback_url,
            "AccountReference": f"Chama_{pool.id}",
            "TransactionDesc": f"Contribution to {pool.group.name}"
        }

        # PRODUCTION CHANGE: Use standard fallback if environment variable is not explicitly declared
        api_base_url = os.environ.get("DARAJA_API_BASE_URL", "https://sandbox.safaricom.co.ke")
        api_url = f"{api_base_url.rstrip('/')}/mpesa/stkpush/v1/processrequest"
        
        try:
            response = requests.post(api_url, json=payload, headers=headers)
            response_data = response.json()
            
            if response.status_code == 200 and "CheckoutRequestID" in response_data:
                # 5. Log it locally!
                MpesaPayment.objects.create(
                    pool=pool,
                    vendor=request.user,
                    amount=amount,
                    checkout_request_id=response_data["CheckoutRequestID"],
                    status='PENDING'
                )
                return Response({"message": "STK Push sent to your phone!"}, status=status.HTTP_200_OK)
            else:
                print(f"Daraja Error: {response_data}")
                return Response({"error": "Failed to initiate payment with Safaricom."}, status=status.HTTP_502_BAD_GATEWAY)
                
        except Exception as e:
            print(f"Network Error reaching Daraja: {str(e)}")
            return Response({"error": "Payment gateway is currently unreachable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class DarajaCallbackView(APIView):
    """
    Safaricom hits this endpoint asynchronously after the user enters or cancels their M-Pesa PIN.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        callback_data = request.data
        print("====== DARAJA CALLBACK RECEIVED ======")
        print(json.dumps(callback_data, indent=2))
        
        stk_callback = callback_data.get("Body", {}).get("stkCallback", {})
        result_code = stk_callback.get("ResultCode")
        checkout_request_id = stk_callback.get("CheckoutRequestID")
        result_desc = stk_callback.get("ResultDesc")

        # Find the respective local pending record
        try:
            payment = MpesaPayment.objects.get(checkout_request_id=checkout_request_id)
        except MpesaPayment.DoesNotExist:
            print(f"⚠️ CheckoutRequestID {checkout_request_id} not found in database.")
            return Response({"ResultCode": 1, "ResultDesc": "Rejected"}, status=status.HTTP_404_NOT_FOUND)

        # NFR-REL-002: Webhook Idempotency 
        if payment.status in ['COMPLETED', 'FAILED']:
            print("⚠️ Webhook already processed for this transaction. Ignoring.")
            return Response({"ResultCode": 0, "ResultDesc": "Already processed"}, status=status.HTTP_200_OK)

        # ResultCode 0 means transaction went through completely
        if result_code == 0:
            callback_metadata = stk_callback.get("CallbackMetadata", {}).get("Item", [])
            metadata = {item["Name"]: item.get("Value") for item in callback_metadata}
            
            # Extract transactional metadata parameters
            amount_paid = metadata.get("Amount")
            mpesa_receipt = metadata.get("MpesaReceiptNumber")
            
            # 1. Update Payment Record
            payment.status = 'COMPLETED'
            if hasattr(payment, 'mpesa_receipt_number'):
                payment.mpesa_receipt_number = mpesa_receipt
            elif hasattr(payment, 'receipt_number'):
                payment.receipt_number = mpesa_receipt
            payment.save()

            # 2. Update Pool Balance Logic
            pool = payment.pool
            pool.collected += int(float(amount_paid)) # Safely cast to float then int
            
            # Check if target is met
            if pool.collected >= pool.target_amount:
                pool.status = 'COMPLETED'
                print(f"🎉 POOL TARGET MET! Pool {pool.id} marked as COMPLETED.")
                
            pool.save()
            print(f"✅ Success! Local payment record updated. Receipt: {mpesa_receipt}, Pool Balance: KES {pool.collected}")

            if pool.status == 'COMPLETED':
                from .models import QRVoucher
                
                # Fetch all successful payments for this specific pool
                successful_payments = MpesaPayment.objects.filter(pool=pool, status='COMPLETED')
                
                for pmt in successful_payments:
                    # Guard check to prevent double-generation if webhook retriggers
                    voucher_exists = QRVoucher.objects.filter(pool=pool, vendor=pmt.vendor).exists()
                    
                    if not voucher_exists:
                        voucher = QRVoucher.objects.create(
                            pool=pool,
                            vendor=pmt.vendor,
                            amount=pmt.amount
                        )
                        print(f"🎟️ Minted Voucher {voucher.fallback_code} for vendor {pmt.vendor.phone_number}")

                        if hasattr(pmt.vendor, 'is_feature_phone') and pmt.vendor.is_feature_phone:
                            try:
                                from accounts.views import sms
                                msg = f"Chama Cloud: Your voucher is ready! Show code {voucher.fallback_code} to the wholesaler to claim KES {voucher.amount} of stock."
                                sms.send(msg, [pmt.vendor.phone_number])
                                print(f"📩 Automated Fallback SMS Voucher sent to {pmt.vendor.phone_number}")
                            except Exception as sms_err:
                                print(f"⚠️ Fallback SMS Error: {str(sms_err)}")

        else:
            # 1. Mark as Failed
            payment.status = 'FAILED'
            payment.save()
            print(f"❌ Transaction Failed/Cancelled. Code: {result_code} - Reason: {result_desc}")
            
            # 2. Dispatch Retry SMS
            try:
                # Import here to avoid circular imports at file load
                from accounts.views import sms 
                vendor_phone = payment.vendor.phone_number
                message = f"Chama Cloud: Your M-Pesa payment of KES {payment.amount} for '{payment.pool.group.name}' failed or was cancelled. Please retry from your dashboard."
                
                sms.send(message, [vendor_phone])
                print("📩 Failure SMS dispatched.")
            except Exception as e:
                print(f"⚠️ SMS Dispatch Bypassed (Local dev or missing config): {str(e)}")

        return Response({"ResultCode": 0, "ResultDesc": "Accepted"}, status=status.HTTP_200_OK)


class ValidateVoucherView(APIView):
    """
    URL: /api/payments/vouchers/<uuid_or_fallback_code>/
    Accessible by Wholesalers to verify (GET) and claim (POST) a voucher.
    """
    permission_classes = [IsAuthenticated] # Restrict to logged-in wholesalers

    def get(self, request, key):
        from .models import QRVoucher
        
        try:
            if len(key) == 36:
                voucher = QRVoucher.objects.get(id=key)
            else:
                voucher = QRVoucher.objects.get(fallback_code=key.upper())
        except QRVoucher.DoesNotExist:
            return Response({"error": "Invalid voucher code or token."}, status=status.HTTP_404_NOT_FOUND)

        if not voucher.is_valid():
            return Response({
                "status": "INVALID",
                "reason": "Voucher has expired or has already been redeemed.",
                "details": {
                    "code": voucher.fallback_code,
                    "status": voucher.status,
                    "expired": timezone.now() >= voucher.expires_at
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "status": "VALID",
            "voucher_id": str(voucher.id),
            "code": voucher.fallback_code,
            "vendor_phone": voucher.vendor.phone_number,
            "amount_value": voucher.amount,
            "pool_group": voucher.pool.group.name,
            "expires_at": voucher.expires_at
        }, status=status.HTTP_200_OK)

    def post(self, request, key):
        """
        Marks the voucher as REDEEMED after the wholesaler hands over the goods.
        """
        from .models import QRVoucher
        
        # 1. Safely locate the voucher
        try:
            if len(key) == 36:
                voucher = QRVoucher.objects.get(id=key)
            else:
                voucher = QRVoucher.objects.get(fallback_code=key.upper())
        except QRVoucher.DoesNotExist:
            return Response({"error": "Invalid voucher code or token."}, status=status.HTTP_404_NOT_FOUND)

        # 2. Final security check to prevent double-spending
        if not voucher.is_valid():
            return Response({
                "error": "This voucher cannot be redeemed. It is either expired or already claimed."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 3. Consume the voucher
        voucher.status = 'REDEEMED'
        # Optional: You could log `redeemed_by=request.user` here if you add that field to the model later!
        voucher.save()

        print(f"🛍️ VOUCHER REDEEMED: KES {voucher.amount} for {voucher.vendor.phone_number}")

        return Response({
            "status": "SUCCESS",
            "message": f"KES {voucher.amount} voucher successfully redeemed!",
            "vendor_phone": voucher.vendor.phone_number,
            "pool_group": voucher.pool.group.name
        }, status=status.HTTP_200_OK)