import pytest
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework_simplejwt.tokens import AccessToken

from taxi.asgi import application
from trips.models import Trip

TEST_CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}


@database_sync_to_async
def create_user(
    username,
    password,
    group="rider",
):
    user = get_user_model().objects.create_user(
        username=username,
        password=password,
    )
    user_group, _ = Group.objects.get_or_create(name=group)
    user.groups.add(user_group)
    user.save()
    access = AccessToken.for_user(user)
    return user, access


@database_sync_to_async
def create_trip(  # Todo: factory_boy :')
    pick_up_address="123 Main Street",
    drop_off_address="456 Piney Road",
    status="REQUESTED",
    rider=None,
    driver=None,
):
    return Trip.objects.create(
        pick_up_address=pick_up_address,
        drop_off_address=drop_off_address,
        status=status,
        rider=rider,
        driver=driver,
    )


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
class TestWebSocket:
    async def test_can_connect_to_server(self, settings):
        settings.CHANNEL_LAYERS = TEST_CHANNEL_LAYERS
        _, access = await create_user("test.user@example.com", "pAssw0rd")
        communicator = WebsocketCommunicator(
            application=application, path=f"/taxi/?token={access}"
        )
        connected, _ = await communicator.connect()
        assert connected is True
        await communicator.disconnect()

    async def test_can_send_and_receive_messages(self, settings):
        settings.CHANNEL_LAYERS = TEST_CHANNEL_LAYERS
        _, access = await create_user("test.user@example.com", "pAssw0rd")
        communicator = WebsocketCommunicator(
            application=application, path=f"/taxi/?token={access}"
        )
        await communicator.connect()
        message = {
            "type": "echo.message",
            "data": "This is a test message.",
        }
        await communicator.send_json_to(message)
        response = await communicator.receive_json_from()
        assert response == message
        await communicator.disconnect()

    async def test_cannot_connect_to_socket(self, settings):
        settings.CHANNEL_LAYERS = TEST_CHANNEL_LAYERS
        communicator = WebsocketCommunicator(application=application, path="/taxi/")
        connected, _ = await communicator.connect()
        assert connected is False
        await communicator.disconnect()

    async def test_join_driver_pool(self, settings):
        settings.CHANNEL_LAYERS = TEST_CHANNEL_LAYERS
        _, access = await create_user("test.user@example.com", "pAssw0rd", "driver")
        communicator = WebsocketCommunicator(
            application=application, path=f"/taxi/?token={access}"
        )
        await communicator.connect()
        message = {
            "type": "echo.message",
            "data": "This is a test message.",
        }
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            "drivers",
            message=message,
        )
        response = await communicator.receive_json_from()
        assert response == message
        await communicator.disconnect()

    async def test_request_trip(self, settings):
        settings.CHANNEL_LAYERS = TEST_CHANNEL_LAYERS
        user, access_token = await create_user(
            "user1",
            "password",
            "rider",
        )
        communicator = WebsocketCommunicator(
            application=application,
            path=f"/taxi/?token={access_token}",
        )
        await communicator.connect()
        request = {
            "type": "create.trip",
            "data": {
                "pick_up_address": "123 Main Street",
                "drop_off_address": "456 Piney Road",
                "rider": user.id,
            },
        }

        await communicator.send_json_to(request)

        response = await communicator.receive_json_from()
        response_data = response.get("data")
        assert response_data["id"] is not None  # check for a PK
        assert response_data["pick_up_address"] == request["data"]["pick_up_address"]
        assert response_data["drop_off_address"] == request["data"]["drop_off_address"]
        assert response_data["status"] == "REQUESTED"
        assert response_data["rider"]["username"] == user.username
        assert response_data["driver"] is None  # nobody picked it up yet
        await communicator.disconnect()

    async def test_driver_alerted_on_request(self, settings):
        settings.CHANNEL_LAYERS = TEST_CHANNEL_LAYERS

        # Listen to the 'drivers' group test channel.
        channel_layer = get_channel_layer()
        await channel_layer.group_add(group="drivers", channel="test_channel")

        user, access_token = await create_user(
            "test.user@example.com",
            "pAssw0rd",
            "rider",
        )
        communicator = WebsocketCommunicator(
            application=application,
            path=f"/taxi/?token={access_token}",
        )
        await communicator.connect()

        # Request a trip.
        request = {
            "type": "create.trip",
            "data": {
                "pick_up_address": "123 Main Street",
                "drop_off_address": "456 Piney Road",
                "rider": user.id,
            },
        }
        await communicator.send_json_to(request)

        # Receive JSON message from server on test channel.
        response = await channel_layer.receive("test_channel")
        response_data = response.get("data")

        assert response_data["id"] is not None
        assert response_data["rider"]["username"] == user.username
        assert response_data["driver"] is None

        await communicator.disconnect()

    async def test_create_trip_group(self, settings):
        """
        Test that an individual trip related group is created and
        the user is subscribed to that channel
        """
        settings.CHANNEL_LAYERS = TEST_CHANNEL_LAYERS
        user, access_token = await create_user(
            "test.user@example.com",
            "pAssw0rd",
            "rider",
        )
        communicator = WebsocketCommunicator(
            application=application,
            path=f"/taxi/?token={access_token}",
        )
        await communicator.connect()
        request = {
            "type": "create.trip",
            "data": {
                "pick_up_address": "123 Main Street",
                "drop_off_address": "456 Piney Road",
                "rider": user.id,
            },
        }
        await communicator.send_json_to(request)
        response = await communicator.receive_json_from()
        response_data = response.get("data")
        message = {
            "type": "echo.message",
            "data": "This is a test message.",
        }
        channel_layer = get_channel_layer()

        # Now, send a message to the group
        # if it exists, and we are  subscribed to it,
        # we will be able to receive it
        await channel_layer.group_send(
            response_data["id"],
            message=message,
        )
        response_second = await communicator.receive_json_from()

        assert response_second == message
        await communicator.disconnect()

    async def test_join_trip_group_on_connect(self, settings):
        """
        test that our user gets connected to the trip specific group and
        is able to receive messages **if the trip already exists**

        This models a case of a reestablished connection.
        Compare to `test_create_trip_group`, where the trip is created
        within the context of an established connection.


        """
        settings.CHANNEL_LAYERS = TEST_CHANNEL_LAYERS
        user, access_token = await create_user(
            "test.user@example.com",
            "pAssw0rd",
            "rider",
        )
        trip = await create_trip(rider=user)
        communicator = WebsocketCommunicator(
            application=application,
            path=f"/taxi/?token={access_token}",
        )
        connected, _ = await communicator.connect()
        message = {
            "type": "echo.message",
            "data": "This is a test message.",
        }
        channel_layer = get_channel_layer()

        await channel_layer.group_send(
            f"{trip.id}",
            message=message,
        )
        response = await communicator.receive_json_from()

        assert response == message
        await communicator.disconnect()
