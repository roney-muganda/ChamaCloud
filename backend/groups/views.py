import os
import africastalking
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import VendorGroup, GroupMembership
from django.contrib.auth import get_user_model
from chamacloud.utils import normalize_phone

User = get_user_model()

os.environ['NO_PROXY'] = '*' 
africastalking.initialize(
    username=os.environ.get("AT_USERNAME", "sandbox"),
    api_key=os.environ.get("AT_API_KEY")
)
sms = africastalking.SMS

class GroupCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Returns all groups the current user is a member of"""
        groups = VendorGroup.objects.filter(members__vendor=request.user).distinct()
        data = [{"id": group.id, "name": group.name, "member_count": group.members.count()} for group in groups]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get("name")
        if not name:
            return Response({"error": "Group name is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if VendorGroup.objects.filter(name__iexact=name).exists():
            return Response(
                {"error": f"A group named '{name}' already exists. Please choose a unique name."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # FR-V-010: Create group, creator becomes admin
        group = VendorGroup.objects.create(name=name, admin=request.user)
        
        # Auto-add the admin as the first member
        GroupMembership.objects.create(group=group, vendor=request.user)
        
        return Response({
            "message": "Group created successfully",
            "group_id": group.id,
            "name": group.name
        }, status=status.HTTP_201_CREATED)


class GroupInviteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id):
        try:
            group = VendorGroup.objects.get(id=group_id, admin=request.user)
        except VendorGroup.DoesNotExist:
            return Response({"error": "Group not found or you are not the admin"}, status=status.HTTP_403_FORBIDDEN)
            
        phone_numbers = request.data.get("phone_numbers", [])
        
        if not phone_numbers:
            return Response({"error": "Provide at least one phone number"}, status=status.HTTP_400_BAD_REQUEST)

        # Normalize all incoming target numbers cleanly
        normalized_numbers = [normalize_phone(p) for p in phone_numbers]

        for phone in normalized_numbers:
            # 1. Get the user if they exist, or create a placeholder using phone as username
            invited_user, created = User.objects.get_or_create(
                phone_number=phone,
                defaults={'username': phone, 'is_vendor': True}
            )
            
            # 2. Add them to the group
            GroupMembership.objects.get_or_create(
                group=group,
                vendor=invited_user
            )

        # FR-V-011: Send SMS Invites using the safe numbers list
        message = f"You've been invited to join the Chama '{group.name}' by {request.user.username}. Log in to Chama Cloud to join!"
        
        try:
            sms.send(message, normalized_numbers)
            return Response({"message": f"Invites sent to {len(normalized_numbers)} members."}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"⚠️ SMS Bypassed: {str(e)}")
            return Response({"message": "Invites logged locally (AT SMS bypassed for dev)."}, status=status.HTTP_200_OK)