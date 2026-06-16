from django.db import models
from accounts.models import User

class VendorGroup(models.Model):
    name = models.CharField(max_length=255)
    admin = models.ForeignKey(User, on_delete=models.PROTECT, related_name='admin_groups')
    chama_score = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class GroupMembership(models.Model):
    group = models.ForeignKey(VendorGroup, on_delete=models.CASCADE, related_name='members')
    vendor = models.ForeignKey(User, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('group', 'vendor')

class ChamaScoreEvent(models.Model):
    group = models.ForeignKey(VendorGroup, on_delete=models.CASCADE)
    event_type = models.CharField(max_length=100)
    delta = models.IntegerField() # e.g., +5 or -10
    new_score = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True) # Append-only