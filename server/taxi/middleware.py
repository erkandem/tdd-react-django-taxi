from urllib.parse import parse_qs

from channels.auth import AuthMiddleware
from channels.db import database_sync_to_async
from channels.sessions import CookieMiddleware, SessionMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


@database_sync_to_async
def get_user(scope):
    close_old_connections()
    query_string = parse_qs(scope["query_string"].decode())
    token = query_string.get("token")
    if not token:
        return AnonymousUser()
    try:
        access_token = AccessToken(token[0])
        user = User.objects.get(id=access_token["id"])
    except Exception as exception:
        return AnonymousUser()
    if not user.is_active:
        return AnonymousUser()
    return user


class TokenAuthMiddleware(AuthMiddleware):
    async def resolve_scope(self, scope):
        """overwrites the parent classes method to populate the scope with the
        current user with our custom method, which is
          - based on token authentication and
          - pulls the token out of a query parameter because
            custom headers aren't allowed? in WebSockets
        """
        scope["user"]._wrapped = await get_user(scope)


def TokenAuthMiddlewareStack(inner):
    return CookieMiddleware(SessionMiddleware(TokenAuthMiddleware(inner)))
