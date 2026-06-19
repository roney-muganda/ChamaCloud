from django.contrib import admin
from accounts.models import User, Wholesaler, WholesalerApplication
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

# NEW: Register the WholesalerApplication so it appears in the Django Admin
@admin.register(WholesalerApplication)
class WholesalerApplicationAdmin(admin.ModelAdmin):
    # What columns to show in the main table
    list_display = ('business_name', 'phone', 'location', 'status', 'created_at')
    
    # Allows filtering by status (Pending/Approved/Rejected) on the right sidebar
    list_filter = ('status', 'created_at')
    
    # Adds a search bar at the top
    search_fields = ('business_name', 'phone', 'location')
    
    # This is the magic line: lets you change 'PENDING' to 'APPROVED' without opening the record!
    list_editable = ('status',)