from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from chamacloud.utils import normalize_phone

User = get_user_model()

class NormalizedPhoneAuthBackend(ModelBackend):
    """
    Custom authentication backend that normalizes phone numbers/usernames
    before performing a login lookup. This ensures 07... and +254...
    both resolve to the same account.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            return None

        # 1. Try finding the user by normalizing the input as a phone number
        clean_identifier = normalize_phone(username)
        
        try:
            # Check if a user exists with this normalized phone number OR username
            user = User.objects.get(phone_number=clean_identifier)
        except User.DoesNotExist:
            try:
                # Fallback: Check if they used a literal username string like 'admin'
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                return None

        # 2. Verify the password if a user was found
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
            
        return None