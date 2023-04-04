# Django-Channels-React Taxi App

# Part 1

Part 1 takes care of setting up the backend
## 1. Intro
## 2. Changelog
## 3. Getting Started

 - managed requirements with `pip-tools`
 - env vars with `django-environ`
 - create custom user model
 - wired custom user model up with admin
 - adjusted settings for
    - database
    - custom user model
    - channels
    - redis connection
    - the installed apps
 - `asgi.py` needs to be adjusted for daphne
 - added `Makefile`

## 4 Authentication

A sign-up  and a login API view were created since
we won't use the Django log in view (except for the admin area)
That's why we added `SessionAuthentication` to the authentication  options in the
project settings?

Sign-Up view http://localhost:8000/api/sign_up/
Login view: http://localhost:8000/api/log_in/

... with the beautiful DRF UI :).

TODO: Could create a schema which includes all routes etc. to simplify client generation.
      
### Token Based Auth
The `rest_framework_simplejwt` package drastically simplifies the issuance of tokens.


### Token
Sample of issued tokens decoded using jwt.io (signed using our app secret key)
Reference: https://django-rest-framework-simplejwt.readthedocs.io/

Header:
```json
   {
      "alg": "HS256",
      "typ": "JWT"
   }
```

Payload:

```json
{
  "token_type": "access",
  "exp": 1680442365,
  "iat": 1680438765,
  "jti": "9376624ae47f42899f2627c5528cac9a",
  "id": 1,
  "username": "erkan",
  "first_name": "",
  "last_name": ""
}
```

And the payload of the refresh token:
```json
{
  "token_type": "refresh",
  "exp": 1680525165,
  "iat": 1680438765,
  "jti": "71ff964c230b40938d0331d15147a92e",
  "id": 1,
  "username": "erkan",
  "first_name": "",
  "last_name": ""
}
```

## 5 Trips Model, Admin, Serializer and View

This chapter added the functionality to store trips, manipulate them via the admin interface and
read them all as a list or individually.

### Model

The id field was implented as UUID field since serial number don't offer much value
besides giving away how many trips the app has had.

`get_absolute_url` is a nice utility.

Departure and arrival location are done as simple char field. 
Of course, that wouldn't work in real life. It's a tutorial

### Admin

Besides simply registering the model to the admin interface
there is also the option to customize it:
Ref: https://docs.djangoproject.com/en/4.1/ref/contrib/admin/

### Serializer

As usual except that I don't like `fields = "__all__"`.
Always prefer to be explicit about the (public) exposure.
Since `id`, `created` and `updated` are used internally, they were set to read only.

### View

A read only view was created using `ReadOnlyModelViewSet`.
That view set includes functionality to service GET request and serves the list of
trips and if an uuid of the trip is supplied the individual trip.

Ref: https://www.django-rest-framework.org/api-guide/viewsets/#readonlymodelviewset

The list and detail API view was bundled in new `urls.py` in the `trips` app and
wired up to the project using `django.urls.include`.

The list or detail view is set during the wiring as an argument to `as_view` 
```python
urlpatterns = [
    path("", TripView.as_view({"get": "list"}), name="trip_list"),
    path("<uuid:trip_id>/", TripView.as_view({"get": "retrieve"}), name="trip_detail"),
]
```

List: http://127.0.0.1:8000/api/trip/
Detail: http://127.0.0.1:8000/api/trip/0fe29a3e-edb4-4dcd-92a7-212b2fe021d5/

### 6 Websockets - Part 1

Goal of this part was to set up the connectivity via the websocket protocol.
The created connectivity was also protected with authentication

#### Websocket "view"

What would correspond to a classic django view is called `consumer`.
For that reason a new module in the trips app called `consumers` was created.

Since we intend to exchange JSON encoded message for our JS front end 
a `channels.generic.websocket.AsyncJsonWebsocketConsumer` was chosen for the consumer
super class.

Ref: https://channels.readthedocs.io/en/stable/topics/consumers.html#asyncjsonwebsocketconsumer

Async? Should work better for Python anyway (GIL).
 - `accept` was overwritten to implement a check for authentication
 - `disconnect` was necessary to overwrite to call the super classes' method
 - `receive_json` was also necessary since it's not implemented
 
Further reading on async:
 - https://docs.python.org/3/library/asyncio.html
 - https://www.aeracode.org/2018/02/19/python-async-simplified/
 - https://testdriven.io/blog/concurrency-parallelism-asyncio/

#### Wiring up the Communicator

the application object in the projects `asgi` module is used and expanded with
`channels.routing.ProtocolTypeRouter`

```python 
application = ProtocolTypeRouter(
    {
        "http": get_asgi_application(),
        "websocket": TokenAuthMiddlewareStack(
            URLRouter([path("taxi/", TaxiConsumer.as_asgi())])
        ),
    }
)


```
#### Testing the Websocket

 - We are forced to use pytest because of the channels dependencies.
   pytest in combo with django needs an ini with the `DJANGO_SETTINGS_MODULE` key value pair. 
 - Instead of the database fixture, the decorator was used to permit db access.
 - Since we are testing async code we use the pytest plugin for asyncio to enable the test to run.
 - The `settings` fixture is used to monkeypatch our `CHANNEL_LAYERS` settings
   Instead of the redis layer, an in memory storage is used.
```python
TEST_CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}
```
 - `channels.testing.WebsocketCommunicator` is the equivalent to classic `client`.
    - It's kwargs are the `asgi` application (like with the Flask client) and
    - the `path` (like with a http client)

```python
@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
    class TestWebSocket
       async def test_cannot_connect_to_socket(self, settings):
         settings.CHANNEL_LAYERS = TEST_CHANNEL_LAYERS
         communicator = WebsocketCommunicator(application=application, path="/taxi/")
         connected, _ = await communicator.connect()
         assert connected is False
         await communicator.disconnect()
```

#### Authentication

The authentication is done via JWT token which is passed as a query parameter.
The token is read out and the "context" here called "scope" of the request is populated with the result.
The above step is done using a middleware, placed in the `middleware` module of the project package.

Specifically, the `get_user` method is overwritten to account for the different location of the token.

Ref: https://docs.djangoproject.com/en/4.1/topics/http/middleware/ 

