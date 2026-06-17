import os
import base64
import requests
from datetime import datetime
from requests.auth import HTTPBasicAuth

def get_mpesa_access_token():
    """Generates a short-lived OAuth access token from Daraja"""
    consumer_key = os.environ.get('DARAJA_CONSUMER_KEY')
    consumer_secret = os.environ.get('DARAJA_CONSUMER_SECRET')
    
    # Using the sandbox URL for development
    api_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"

    response = requests.get(api_url, auth=HTTPBasicAuth(consumer_key, consumer_secret))
    response.raise_for_status() # Fail loudly if auth fails
    
    return response.json()['access_token']

def generate_stk_password():
    """Generates the base64 encoded password required for STK Pushes"""
    shortcode = os.environ.get('DARAJA_BUSINESS_SHORTCODE')
    passkey = os.environ.get('DARAJA_PASSKEY')
    
    # Daraja requires a timestamp in the exact format YYYYMMDDHHmmss
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    
    data_to_encode = shortcode + passkey + timestamp
    encoded_password = base64.b64encode(data_to_encode.encode()).decode('utf-8')
    
    return encoded_password, timestamp