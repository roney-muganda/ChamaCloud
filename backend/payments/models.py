import uuid
import random
import string
from django.db import models
from accounts.models import User
from django.utils import timezone
from django.contrib.auth import get_user_model
from pools.models import Pool

User = get_user_model()

def generate_fallback_code():
    """Generates a short, unique 6-character alphanumeric code for feature phones (e.g., CC-W38X)"""
    chars = string.ascii_uppercase + string.digits
    code = ''.join(random.choices(chars, k=6))
    return f"CC-{code}"

def default_expiry():
    """Vouchers expire exactly 48 hours from issuance (NFR-SEC-003)"""
    return timezone.now() + timezone.timedelta(hours=48)

class MpesaPayment(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    )
    
    # Updated related_names to avoid clashing with pools.Contribution
    pool = models.ForeignKey(Pool, on_delete=models.CASCADE, related_name='mpesa_payments')
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mpesa_payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Safaricom's unique tracking ID for the STK Push
    checkout_request_id = models.CharField(max_length=150, unique=True)
    
    # The actual M-Pesa receipt (e.g., QWE123456) - Null until successful webhook
    mpesa_receipt_number = models.CharField(max_length=100, unique=True, null=True, blank=True)
    
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    
    # We will use this to store the exact reason for failure (e.g., "Insufficient Funds")
    failure_reason = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.vendor.username} - KES {self.amount} - {self.status}"

class QRVoucher(models.Model):
    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('REDEEMED', 'Redeemed'),
        ('EXPIRED', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pool = models.ForeignKey(Pool, on_delete=models.CASCADE, related_name='vouchers')
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vouchers')
    amount = models.IntegerField() # The amount this specific user contributed
    
    # Fallback for USSD / Feature phone users
    fallback_code = models.CharField(max_length=12, default=generate_fallback_code, unique=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=default_expiry)

    def is_valid(self):
        """Checks if the voucher is active and hasn't timed out"""
        if self.status == 'AVAILABLE' and timezone.now() < self.expires_at:
            return True
        if self.status == 'AVAILABLE' and timezone.now() >= self.expires_at:
            self.status = 'EXPIRED'
            self.save()
        return False

    def __str__(self):
        return f"Voucher {self.fallback_code} - {self.vendor.phone_number} (KES {self.amount})"