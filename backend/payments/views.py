import os
import requests
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from .models import MpesaPayment
from pools.models import Pool
from .mpesa import get_mpesa_access_token, generate_stk_password

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
        phone_number = request.user.phone_number.replace('+', '')
        
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
        
        # Your callback URL MUST be publicly accessible so Safaricom can hit it.
        # We will use your live Render URL.
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
            "Amount": 1,
            "PartyA": phone_number,
            "PartyB": shortcode,
            "PhoneNumber": phone_number,
            "CallBackURL": callback_url,
            "AccountReference": f"Chama_{pool.id}",
            "TransactionDesc": f"Contribution to {pool.group.name}"
        }

        # 4. Fire the STK Push
        api_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        
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