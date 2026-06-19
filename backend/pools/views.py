from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Pool
from groups.models import VendorGroup

class PoolCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # 1. Catch both React's camelCase and Django's snake_case
        group_id = request.data.get("group_id") or request.data.get("groupId")
        target_amount = float(request.data.get("target_amount", 0))
        contribution_per_member = float(request.data.get("contribution_per_member", 0))
        deadline = request.data.get("deadline") 

        if not group_id:
            return Response({"error": "Group ID is missing from the request."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # 2. Allow ANY member of the group to start the next funding round, not just the admin
            group = VendorGroup.objects.get(id=group_id, members__vendor=request.user)
        except VendorGroup.DoesNotExist:
            return Response({"error": "Group not found or unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        # Enforce minimum 3 members
        member_count = group.members.count()
        if member_count < 3:
            return Response({"error": f"Group must have at least 3 members. Currently has {member_count}."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Auto-calculate missing frontend data
        if contribution_per_member == 0:
            contribution_per_member = target_amount / member_count

        if not deadline:
            # Automatically set the deadline to 7 days from now
            deadline = timezone.now() + timedelta(days=7)

        # Create the Pool
        pool = Pool.objects.create(
            group=group,
            target_amount=target_amount,
            deadline=deadline,
            status='OPEN'
        )
        
        return Response({"message": "Pool created successfully", "pool_id": pool.id}, status=status.HTTP_201_CREATED)


class PoolStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pool_id):
        try:
            pool = Pool.objects.get(id=pool_id, group__members__vendor=request.user)
        except Pool.DoesNotExist:
            return Response({"error": "Pool not found or you are not a member"}, status=status.HTTP_404_NOT_FOUND)

        # Calculate Pool Status
        remaining = float(pool.target_amount) - float(pool.current_balance)
        
        return Response({
            "pool_id": pool.id,
            "group_name": pool.group.name,
            "target_amount": pool.target_amount,
            "collected": pool.current_balance,
            "remaining": max(0, remaining),
            "status": pool.status,
            "deadline": pool.deadline
        }, status=status.HTTP_200_OK)


class ActivePoolView(APIView):
    """
    Dynamically fetches the OPEN pool for the currently authenticated user.
    No hardcoded IDs required.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Find the OPEN pool linked to the group the user is a member of
            pool = Pool.objects.get(group__members__vendor=request.user, status='OPEN')
            
            remaining = float(pool.target_amount) - float(pool.current_balance)
            
            return Response({
                "pool_id": pool.id,
                "group_id": pool.group.id,  
                "group_name": pool.group.name,
                "target_amount": pool.target_amount,
                "collected": pool.current_balance,
                "remaining": max(0, remaining),
                "status": pool.status,
                "deadline": pool.deadline
            }, status=status.HTTP_200_OK)
            
        except Pool.DoesNotExist:
            return Response({
                "error": "You do not have an active pool right now."
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Pool.MultipleObjectsReturned:
            pool = Pool.objects.filter(group__members__vendor=request.user, status='OPEN').first()
            remaining = float(pool.target_amount) - float(pool.current_balance)
            return Response({
                "pool_id": pool.id,
                "group_id": pool.group.id,  
                "group_name": pool.group.name,
                "target_amount": pool.target_amount,
                "collected": pool.current_balance,
                "remaining": max(0, remaining),
                "status": pool.status,
                "deadline": pool.deadline
            }, status=status.HTTP_200_OK)