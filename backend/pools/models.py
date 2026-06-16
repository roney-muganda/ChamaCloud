from django.db import models
from groups.models import VendorGroup
from accounts.models import User, Wholesaler

class Pool(models.Model):
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('FUNDED', 'Funded'),
        ('VOUCHER_ISSUED', 'Voucher Issued'),
        ('CLAIMED', 'Claimed'),
        ('EXPIRED', 'Expired'),
        ('PARTIAL', 'Partial'),
    ]
    
    group = models.ForeignKey(VendorGroup, on_delete=models.CASCADE)
    wholesaler = models.ForeignKey(Wholesaler, on_delete=models.SET_NULL, null=True, blank=True)
    target_amount = models.DecimalField(max_digits=10, decimal_places=2)
    current_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    deadline = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

class Contribution(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]
    
    pool = models.ForeignKey(Pool, on_delete=models.CASCADE, related_name='contributions')
    vendor = models.ForeignKey(User, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    mpesa_ref = models.CharField(max_length=50, unique=True, null=True, blank=True) # Idempotency key
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)