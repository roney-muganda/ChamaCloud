from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # Using phone number as the primary identifier
    phone_number = models.CharField(max_length=15, unique=True)
    is_vendor = models.BooleanField(default=True)
    is_feature_phone = models.BooleanField(
        default=False, 
        help_text="If True, the system will automatically send SMS fallback vouchers to this user."
    )
    is_wholesaler = models.BooleanField(
        default=False, 
        help_text="Designates whether this user operates as a wholesaler."
    )
    is_approved_wholesaler = models.BooleanField(
        default=False, 
        help_text="Designates whether the admin has verified and approved this wholesaler to redeem vouchers."
    )
    business_name = models.CharField(max_length=255, blank=True, null=True)
    business_location = models.CharField(max_length=255, blank=True, null=True)
    
    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = ['username']

class Wholesaler(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    business_name = models.CharField(max_length=255)
    kra_pin = models.CharField(max_length=50, unique=True)
    mpesa_till = models.CharField(max_length=20)
    is_verified = models.BooleanField(default=False) # KYB approval flow in Admin
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.business_name


class WholesalerApplication(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected')
    ]

    business_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    location = models.CharField(max_length=255)
    product_categories = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.business_name} ({self.status})"