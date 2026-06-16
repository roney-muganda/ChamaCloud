from django.db import models

class SMSLog(models.Model):
    recipient_phone = models.CharField(max_length=15)
    event_type = models.CharField(max_length=50)
    status = models.CharField(max_length=50)
    provider_ref = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)