from django.urls import path
from .views import PoolCreateView, PoolStatusView, ActivePoolView, WholesalerListView

urlpatterns = [
    path('pools/', PoolCreateView.as_view(), name='create-pool'),
    path('pools/active/', ActivePoolView.as_view(), name='active-pool'), # New dynamic route
    path('pools/<int:pool_id>/status/', PoolStatusView.as_view(), name='pool-status'),
    path('wholesalers/', WholesalerListView.as_view(), name='wholesaler-list'),
]