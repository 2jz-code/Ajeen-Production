# orders/routing.py (update existing file)
from django.urls import re_path
from .consumers import WebsiteOrderStatusConsumer
from .kitchen.consumers import KitchenOrderConsumer
from .pos_consumers import POSUpdatesConsumer

websocket_urlpatterns = [
    # Existing patterns
    re_path(
        r"ws/website/orders/(?P<order_id>\d+)/$", WebsiteOrderStatusConsumer.as_asgi()
    ),
    # Add kitchen WebSocket
    re_path(r"ws/kitchen/orders/$", KitchenOrderConsumer.as_asgi()),
    re_path(r"ws/pos_updates/$", POSUpdatesConsumer.as_asgi()),
]
