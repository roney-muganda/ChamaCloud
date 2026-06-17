from django.db import models
from accounts.models import User
from pools.models import Pool

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