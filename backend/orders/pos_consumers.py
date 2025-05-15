# backend/orders/pos_consumers.py (or an appropriate existing file)
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async  # If needed for auth/location validation


class POSUpdatesConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # self.user = self.scope["user"] # Access user if authenticated
        # if not self.user.is_authenticated or not self.user.is_pos_user: # Example auth
        #     await self.close()
        #     return

        # For simplicity, assuming location_id comes from URL or a global POS setting
        # In a real scenario, this would likely be more robust (e.g., part of JWT, URL param)
        self.location_id = self.scope["url_route"]["kwargs"].get(
            "location_id", "default_location"
        )
        self.room_group_name = f"pos_updates_location_{self.location_id}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        print(f"POS WebSocket connected to group {self.room_group_name}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        print(f"POS WebSocket disconnected from group {self.room_group_name}")

    # This method name is derived from the "type" in group_send: "send.print.jobs"
    async def send_print_jobs(self, event):
        """
        Handler for messages of type 'send.print.jobs'.
        It forwards the print job data to the connected POS client.
        """
        await self.send(
            text_data=json.dumps(
                {
                    "type": "new_website_order_for_printing",  # This is the type frontend WebSocketContext will handle
                    "order_id": event["order_id"],
                    "print_jobs": event["print_jobs"],
                }
            )
        )
        print(
            f"Relayed print jobs for order {event['order_id']} to POS client in group {self.room_group_name}"
        )

    # You might have other handlers here for other POS updates
    # async def new_pos_order(self, event): ...
