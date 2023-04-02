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
      
## Token Based Auth
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
