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
from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase


def default_test_password():
    return "root"


def create_user(
    username="username@example.com",
    password=default_test_password(),
    first_name="Test",
    last_name="User",
):
    return get_user_model().objects.create_user(
        username=username,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )


class AuthenticationTest(APITestCase):
    def test_user_can_sign_up(self):
        url = reverse("sign_up")
        User = get_user_model()
        data = {
            "username": "user@example.com",
            "first_name": "Test",
            "last_name": "User",
            "password1": default_test_password(),
            "password2": default_test_password(),
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

    def test_user_can_log_in(self):
        user = create_user()
        url = reverse("log_in")
        data = {
            "username": user.username,
            "password": default_test_password(),
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
