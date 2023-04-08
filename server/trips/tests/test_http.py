"""
TODO:
 - Could be rewritten to pytest
    - convert helper functions to  proper fixtures
 - Anthony Sottile loves class based tests
 - create_user helper can be replaced by factory_boy
"""
import base64
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from trips.models import Trip, User


def get_default_test_password():
    return "root"


def create_user(
    username="username@example.com",
    password=get_default_test_password(),
    first_name="Test",
    last_name="User",
    group_name="rider",
):
    group, _ = Group.objects.get_or_create(name=group_name)
    user = get_user_model().objects.create_user(
        username=username,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )
    user.groups.add(group)
    user.save()
    return user


class AuthenticationTest(APITestCase):
    def test_user_can_sign_up(self):
        url = reverse("sign_up")
        User = get_user_model()
        data = {
            "username": "user@example.com",
            "first_name": "Test",
            "last_name": "User",
            "password1": get_default_test_password(),
            "password2": get_default_test_password(),
            "group": "rider",
        }
        pre_request_user_count = User.objects.count()

        response = self.client.post(url, data=data)

        new_user = User.objects.last()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), pre_request_user_count + 1)
        self.assertEqual(response.data["id"], new_user.id)
        self.assertEqual(response.data["username"], new_user.username)
        self.assertEqual(response.data["first_name"], new_user.first_name)
        self.assertEqual(response.data["last_name"], new_user.last_name)
        self.assertEqual(response.data["group"], new_user.group)

    def test_user_has_non_existing_group_can_not_sign_up(self):
        url = reverse("sign_up")
        User = get_user_model()
        group = "shenanigan"
        self.assertNotIn(group, User.GROUP_CHOICES)
        data = {
            "username": "user@example.com",
            "first_name": "Test",
            "last_name": "User",
            "password1": get_default_test_password(),
            "password2": get_default_test_password(),
            "group": group,
        }

        response = self.client.post(url, data=data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_can_log_in(self):
        user = create_user()
        url = reverse("log_in")
        data = {
            "username": user.username,
            "password": get_default_test_password(),
        }
        response = self.client.post(url, data)
        access = response.data["access"]
        header, payload, signature = access.split(".")
        decoded_payload = base64.b64decode(f"{payload}==")
        payload_data = json.loads(decoded_payload)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data["refresh"])
        self.assertEqual(payload_data["id"], user.id)
        self.assertEqual(payload_data["username"], user.username)
        self.assertEqual(payload_data["first_name"], user.first_name)
        self.assertEqual(payload_data["last_name"], user.last_name)


class HttpTripTest(APITestCase):
    def test_rider_can_list_trips(self):
        rider = create_user(group_name=User.GROUP_RIDER)
        response = self.client.post(
            reverse("log_in"),
            data={
                "username": rider.username,
                "password": get_default_test_password(),
            },
        )
        access_token = response.data["access"]
        trips = [
            Trip.objects.create(pick_up_address="A", drop_off_address="B"),
            Trip.objects.create(pick_up_address="B", drop_off_address="C"),
        ]
        trips[0].rider = rider
        trips[0].save(update_fields=("rider",))

        response = self.client.get(
            reverse("trip:trip_list"),
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        expected_trip_ids = [
            str(trip.id) for trip in trips if trip.rider_id == rider.id
        ]
        actual_trip_ids = [trip.get("id") for trip in response.data]
        self.assertCountEqual(expected_trip_ids, actual_trip_ids)

    def test_driver_can_list_trips(self):
        driver = create_user(group_name=User.GROUP_DRIVER)
        other_driver = create_user(username="other_user", group_name=User.GROUP_DRIVER)
        response = self.client.post(
            reverse("log_in"),
            data={
                "username": driver.username,
                "password": get_default_test_password(),
            },
        )
        access_token = response.data["access"]
        trips = [
            Trip.objects.create(
                pick_up_address="A",
                drop_off_address="B",
                driver=driver,
            ),  # appears
            Trip.objects.create(
                pick_up_address="B",
                drop_off_address="C",
                status=Trip.IN_PROGRESS,
                driver=other_driver,  # does NOT appear
            ),
            Trip.objects.create(
                pick_up_address="D",
                drop_off_address="E",
            ),  # appears
            Trip.objects.create(
                pick_up_address="E",
                drop_off_address="F",
                status=Trip.IN_PROGRESS,
            ),  # does NOT appear
            Trip.objects.create(
                pick_up_address="G",
                drop_off_address="H",
                status=Trip.STARTED,
            ),  # does NOT appear
            Trip.objects.create(
                pick_up_address="I",
                drop_off_address="J",
                status=Trip.COMPLETED,
            ),  # does NOT appear
            Trip.objects.create(
                pick_up_address="J",
                drop_off_address="K",
                status="",
            ),  # does NOT appear
        ]
        response = self.client.get(
            reverse("trip:trip_list"),
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )
        print(json.dumps(response.data, indent=2))
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        expected_trip_ids = [str(trips[0].id), str(trips[2].id)]
        actual_trip_ids = [trip.get("id") for trip in response.data]
        self.assertCountEqual(expected_trip_ids, actual_trip_ids)

    def test_user_can_retrieve_trip_by_id(self):
        # TODO: factory boy :)
        rider = create_user()
        response = self.client.post(
            reverse("log_in"),
            data={
                "username": rider.username,
                "password": get_default_test_password(),
            },
        )
        access_token = response.data["access"]
        trip = Trip.objects.create(
            pick_up_address="A", drop_off_address="B", rider=rider
        )
        response = self.client.get(
            trip.get_absolute_url(),
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(str(trip.id), response.data.get("id"))
