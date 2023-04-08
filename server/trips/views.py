from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import generics, permissions, viewsets
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Trip, User
from .serializers import LogInSerializer, NestedTripSerializer, UserSerializer


class SignUpView(generics.CreateAPIView):
    queryset = get_user_model().objects.all()
    serializer_class = UserSerializer


class LogInView(TokenObtainPairView):
    serializer_class = LogInSerializer


class TripView(viewsets.ReadOnlyModelViewSet):
    lookup_field = "id"
    lookup_url_kwarg = "trip_id"
    serializer_class = NestedTripSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        """provide a group based queryset of trips"""
        user = self.request.user
        if user.group == user.GROUP_DRIVER:
            return Trip.objects.filter(Q(status=Trip.REQUESTED) | Q(driver=user))
        if user.group == user.GROUP_RIDER:
            return Trip.objects.filter(Q(rider=user))
        return Trip.objects.none()
