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
