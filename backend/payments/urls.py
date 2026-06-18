from django.urls import path
from .views import InitiateContributionView, DarajaCallbackView

urlpatterns = [
    path('pool/<int:pool_id>/contribute/', InitiateContributionView.as_view(), name='initiate-payment'),
    path('callback/', DarajaCallbackView.as_view(), name='daraja-callback'),
]