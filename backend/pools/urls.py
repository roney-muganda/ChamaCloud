from django.urls import path
from .views import PoolCreateView, PoolStatusView, ActivePoolView, WholesalerListView

urlpatterns = [
    path('create/', PoolCreateView.as_view(), name='create-pool'),
    
    
    path('active/', ActivePoolView.as_view(), name='active-pool'), 
    path('<int:pool_id>/status/', PoolStatusView.as_view(), name='pool-status'),
    
    
    path('wholesalers/', WholesalerListView.as_view(), name='wholesaler-list'),
]