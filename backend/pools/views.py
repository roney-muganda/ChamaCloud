from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Pool
from groups.models import VendorGroup

class PoolCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        group_id = request.data.get("group_id")
        target_amount = float(request.data.get("target_amount", 0))
        contribution_per_member = float(request.data.get("contribution_per_member", 0))
        deadline = request.data.get("deadline") # Expected format: "YYYY-MM-DD HH:MM:SS"

        try:
            group = VendorGroup.objects.get(id=group_id, admin=request.user)
        except VendorGroup.DoesNotExist:
            return Response({"error": "Group not found or unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        # FR-V-014: Enforce minimum 3 members
        member_count = group.members.count()
        if member_count < 3:
            return Response({"error": f"Group must have at least 3 members. Currently has {member_count}."}, status=status.HTTP_400_BAD_REQUEST)

        # FR-V-021: Validate financial math
        if (contribution_per_member * member_count) < target_amount:
            return Response({"error": f"Math error: {member_count} members paying KES {contribution_per_member} will not hit the KES {target_amount} target."}, status=status.HTTP_400_BAD_REQUEST)

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

        # FR-V-022: Calculate Pool Status
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
            # Fallback just in case a group accidentally creates two open pools
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