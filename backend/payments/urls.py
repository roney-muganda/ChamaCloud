from django.urls import path
from .views import InitiateContributionView

urlpatterns = [
    path('pool/<int:pool_id>/contribute/', InitiateContributionView.as_view(), name='initiate-payment'),
]