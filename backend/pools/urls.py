from django.urls import path
from .views import PoolCreateView, PoolStatusView, ActivePoolView, WholesalerListView

urlpatterns = [
    path('pools/create/', PoolCreateView.as_view(), name='create-pool'),
    path('pools/active/', ActivePoolView.as_view(), name='active-pool'), 
    path('pools/<int:pool_id>/status/', PoolStatusView.as_view(), name='pool-status'),
    path('pools/wholesalers/', WholesalerListView.as_view(), name='wholesaler-list'),
]