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

    def save(self, *args, **kwargs):
        # 1. Track status transitions
        is_newly_approved = False
        is_revoked = False
        
        if self.pk:
            old_instance = WholesalerApplication.objects.get(pk=self.pk)
            if old_instance.status != 'APPROVED' and self.status == 'APPROVED':
                is_newly_approved = True
            # Detect if approval is being taken away
            elif old_instance.status == 'APPROVED' and self.status != 'APPROVED':
                is_revoked = True

        # 2. Save the application normally first
        super().save(*args, **kwargs)

        # 3. Execute Automation based on the transition
        if is_newly_approved or is_revoked:
            from django.contrib.auth import get_user_model
            from chamacloud.utils import normalize_phone # Ensures +254 formatting
            import os
            import africastalking
            
            User = get_user_model()

            # Always normalize the phone number before database lookups
            try:
                clean_phone = normalize_phone(self.phone)
            except Exception:
                clean_phone = self.phone

            if is_newly_approved:
                # A. Create or get the User account safely using normalized phone
                user, created = User.objects.get_or_create(
                    phone_number=clean_phone,
                    defaults={'username': clean_phone}
                )

                # B. Upgrade user to an approved wholesaler
                user.is_wholesaler = True
                user.is_approved_wholesaler = True
                user.business_name = self.business_name
                user.business_location = self.location
                user.save()

                # C. Create the official Wholesaler record
                Wholesaler.objects.get_or_create(
                    user=user,
                    defaults={
                        'business_name': self.business_name,
                        'kra_pin': f"PENDING-{self.pk}",
                        'mpesa_till': "PENDING",
                        'is_verified': True
                    }
                )

                # D. Send the SMS Alert to the normalized number
                africastalking.initialize(
                    username=os.environ.get("AT_USERNAME", "sandbox"),
                    api_key=os.environ.get("AT_API_KEY")
                )
                sms = africastalking.SMS
                message = f"Congratulations! Your business {self.business_name} has been approved as a Wholesaler on Chama Cloud. You can now log in!"
                
                try:
                    sms.send(message, [clean_phone])
                except Exception as e:
                    print(f"⚠️ SMS Bypassed: {str(e)}")

            # Strip access if the application is downgraded to Rejected/Pending
            elif is_revoked:
                try:
                    user = User.objects.get(phone_number=clean_phone)
                    user.is_approved_wholesaler = False
                    user.save()
                    
                    wholesaler = Wholesaler.objects.filter(user=user).first()
                    if wholesaler:
                        wholesaler.is_verified = False
                        wholesaler.save()
                except User.DoesNotExist:
                    pass # User doesn't exist, nothing to revoke