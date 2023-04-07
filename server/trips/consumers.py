from typing import Any

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from trips.models import Trip
from trips.serializers import NestedTripSerializer, TripSerializer


class TaxiConsumer(AsyncJsonWebsocketConsumer):
    groups = [  # Todo: magic strings ;)
        "test",
    ]

    async def connect(self):
        user = self.scope["user"]
        if user.is_anonymous:
            await self.close()
        else:
            user_group = await self._get_user_group(user)
            if user_group == "driver":
                await self.channel_layer.group_add(
                    group="drivers",  # Todo: "Magic string" =/
                    channel=self.channel_name,
                )
            # connect the user to unfinished trips
            # works on both riders and drivers, since we don't
            # distinguish between them in the getter for the trip IDs
            for trip_id in await self._get_trip_ids(user):
                await self.channel_layer.group_add(
                    group=trip_id,
                    channel=self.channel_name,
                )
            await self.accept()

    async def disconnect(self, code):
        user = self.scope["user"]
        if user.is_anonymous:
            await self.close()
        else:
            user_group = await self._get_user_group(user)
            if user_group == "driver":
                await self.channel_layer.group_discard(
                    group="drivers",
                    channel=self.channel_name,
                )
            for trip_id in await self._get_trip_ids(user):
                # TODO: ok. but we didn't handle the case when a trip get's completed
                #       while trip related users are still connected
                await self.channel_layer.group_discard(
                    group=trip_id, channel=self.channel_name
                )

        await super().disconnect(code)

    @database_sync_to_async
    def _get_user_group(self, user):
        # TODO: What if we have multiple roles associated?
        return user.groups.first().name

    @database_sync_to_async
    def _create_trip(self, data: dict[str, Any]) -> Trip:
        """validates and creates the trip request"""
        serializer = TripSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        # TODO: We didn't check whether the rider in the data
        #       is actually the logged in user. If credentials of a user
        #       are compromised this can be abused.
        return serializer.create(serializer.validated_data)

    @database_sync_to_async
    def _get_trip_data(self, trip: Trip) -> dict[str, Any]:
        """serialize the response object from a  ``Trip`` ORM object"""
        return NestedTripSerializer(trip).data

    @database_sync_to_async
    def _get_trip_ids(self, user):
        """get a list of uncompleted trips"""
        user_groups = user.groups.values_list("name", flat=True)
        if "driver" in user_groups:
            trip_ids = (
                user.trips_as_driver.exclude(
                    status=Trip.COMPLETED,
                )
                .only("id")
                .values_list("id", flat=True)
            )
        else:
            trip_ids = (
                user.trips_as_rider.exclude(
                    status=Trip.COMPLETED,
                )
                .only("id")
                .values_list("id", flat=True)
            )
        return map(str, trip_ids)

    async def echo_message(self, message):
        await self.send_json(message)

    async def create_trip(self, message):
        """create the trip

        After
         - validation, the trip is created,
         - broadcast to the drivers group,
         - creates and adds the requesting user to group specific to the trip and
         - returns the created trip object to the user.

        """
        data = message.get("data")
        trip = await self._create_trip(data)
        trip_data = await self._get_trip_data(trip)
        await self.channel_layer.group_send(
            group="drivers",  # Todo: magic string ;)
            message={
                "type": "echo.message",
                "data": trip_data,
            },
        )
        await self.channel_layer.group_add(
            group=f"{trip.id}",
            channel=self.channel_name,
        )
        await self.send_json(
            {
                "type": "echo.message",
                "data": trip_data,
            }
        )

    @database_sync_to_async
    def _update_trip(self, data: dict[str, any]) -> Trip:
        """"""
        # TODO: is the driver_id in the data the same as the logged in driver?
        # TODO: is the status transition valid? A change from `REQUESTED` to in `INPROGRESS`
        #       seems appropriate. But I see the need to stop e.g `CANCELED` ->`INPROGRESS`
        # use get to avoid keyerror on ["id"] bc DoesNotExist is more Valuable to debug
        instance = Trip.objects.get(id=data.get("id"))
        serializer = TripSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        trip = serializer.update(instance, serializer.validated_data)
        return trip

    async def update_trip(self, message):
        data = message.get("data")
        # assign a driver to the trip
        trip = await self._update_trip(data)
        trip_data = await self._get_trip_data(trip)
        # we add send the message to the trip group
        # first before we add the driver to the trip group
        # to avoid a duplicate message for the driver?
        await self.channel_layer.group_send(
            group=f"{trip.id}",
            message={
                "type": "echo.message",
                "data": trip_data,
            },
        )
        # add the driver to the group channel
        await self.channel_layer.group_add(
            group=f"{trip.id}",
            channel=self.channel_name,
        )
        # return the response object
        await self.send_json(
            {
                "type": "echo.message",
                "data": trip_data,
            }
        )

    async def receive_json(self, content, **kwargs):
        """inspect the message type and forward the content to respective handler"""
        message_type = content.get("type")
        if message_type == "echo.message":
            await self.echo_message(content)
        elif message_type == "create.trip":
            await self.create_trip(content)
        elif message_type == "update.trip":
            await self.update_trip(content)
