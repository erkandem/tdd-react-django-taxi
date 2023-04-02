from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Trip


class UserSerializer(serializers.ModelSerializer):
    """
    TODO: We don't ask for an email address during sign up ?
          We would also look for spammers or single us addresses.
    """

    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    def validate(self, data):
        if data["password1"] != data["password2"]:
            raise serializers.ValidationError("Passwords must match.")
        return data

    def create(self, validated_data):
        data = {
            key: value
            for key, value in validated_data.items()
            if key not in ("password1", "password2")
        }
        data["password"] = validated_data["password1"]
        return self.Meta.model.objects.create_user(**data)

    class Meta:
        model = get_user_model()
        fields = (
            "id",
            "username",
            "password1",
            "password2",
            "first_name",
            "last_name",
        )
        read_only_fields = ("id",)


class LogInSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        """Adds custom properties to the token.

        We can add anything. Including the role could e.g. be useful
        Ref: https://django-rest-framework-simplejwt.readthedocs.io/en/latest/customizing_token_claims.html
        """
        token = super().get_token(user)
        user_data = UserSerializer(user).data
        for key, value in user_data.items():
            if key != "id":
                token[key] = value
        return token


class TripSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = (
            "id",
            "pick_up_address",
            "drop_off_address",
            "status",
            "created",
            "updated",
        )
        read_only_fields = (
            "id",
            "created",
            "updated",
        )
