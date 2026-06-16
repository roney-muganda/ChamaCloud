# accounts/admin.py
from django.contrib import admin
from accounts.models import User, Wholesaler
from groups.models import VendorGroup, GroupMembership, ChamaScoreEvent
from pools.models import Pool, Contribution
from vouchers.models import QRVoucher
from notifications.models import SMSLog

admin.site.register(User)
admin.site.register(Wholesaler)
admin.site.register(VendorGroup)
admin.site.register(GroupMembership)
admin.site.register(Pool)
admin.site.register(Contribution)
admin.site.register(QRVoucher)
admin.site.register(SMSLog)