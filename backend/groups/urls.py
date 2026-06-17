from django.urls import path
from .views import GroupCreateView, GroupInviteView

urlpatterns = [
    path('groups/', GroupCreateView.as_view(), name='create-group'),
    path('groups/<int:group_id>/invite/', GroupInviteView.as_view(), name='invite-members'),
]