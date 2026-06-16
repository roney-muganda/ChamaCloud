from django.db import models
import uuid
from pools.models import Pool
from accounts.models import User

class QRVoucher(models.Model):
    # UUID4 never sequential
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False) 
    pool = models.OneToOneField(Pool, on_delete=models.CASCADE)
    is_claimed = models.BooleanField(default=False) # Immutable once True
    claimed_at = models.DateTimeField(null=True, blank=True)
    claimed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    expires_at = models.DateTimeField() # Set to issued_at + 48h in business logic
    created_at = models.DateTimeField(auto_now_add=True)