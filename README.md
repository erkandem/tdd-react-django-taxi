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

### 7 Websockets Part 2


In this part, the feature to request a trip will be implemented.
That feature requires the distinction between riders and drivers, which
is done using the `Group` relation of the `User` model.

A channel for drivers is implemented to listen to these trip requests.

#### Driver Role and Channel

Upon establishing a websocket at the taxi endpoint a user associated with the 
`driver` `Group` is added to the `drivers` channel.

#### Trip Model Extension

We extended the `Trip` model with `rider` and `driver` which both are foreign keys
to the custom `User` model.

Since I specified the fields in `Tripserializer`, I needed to extend the `fields  tuple
with the `rider` and `driver` model.

To prepare a more detailed response, a nested serializer was defined, which
will provide more details on both the rider and the driver.

Finally, the admin page also needed to be expanded to the new fields.

#### Consumer / View changes

We implemented a new message type in the respective test called `create.trip`.
The `receive_json` method works as an internal router. There, we forward the
message to the respective handler. In this case it's create_trip.

Database operations are factored out to private sync methods decorated with 
`database_sync_to_async` which enables database access. Sync, bc the decorator
expects to take a **sync** method.  Maybe this would be different if worked 
with an async db driver. But here it `psycopg2`.

#### Broadcasting the Trip Request

The trip is broadcast during the creation of a trip to the drivers group.

### 8 Websockets Part 3

#### A Word on Debugging

I install `ipdb` for more "comfortable" debugging which works nice 
with async code (and tests).
At the point I want to debug the sync/async code I added which dropped a
shell without issues.
```python
import ipdb;ipdb.set_trace()
```
In tests though, we need to add the `-s` flag to the `pytest` command.

A snippet to print database queries via Django:
```python
# settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
        },
    },
    'root': {
        'handlers': ['console'],
    }
}
```


Also added `django-extension` package with its tools to the project.
E.g. a tool to create the application DB schema:
```shell
./manage.py graph_models -a -g -o my_project_visualized.png
```

![part1-chapter6-project-database.png](docs%2Fpart1-chapter6-project-database.png)

#### Accepting a Trip Request

The trip request is accepted by driver upon which the Trip object is updated and
the driver is added to the trip group.


#### Reconnecting a Driver to the Trip Group

We added a driver specific test here but the feature was already implemented
since we didn't distinguish between the roles of a user within `trips.consumers.TaxiConsumer.connect`.

#### Additional Questions

> The rider cancels their request after a driver accepts it

 - The trip is updated to the respective status by the rider (extend `update_trip` method)
 - A group message is sent out
 - Thereafter, the group is dissolved (and participants are removed from the group)

> The server alerts all other drivers in the driver pool that someone has accepted a request.

 - send a message to the drivers group with masked driver id but updated status so
   the UI can react

> The driver periodically broadcasts their location to the rider during a trip.

 - location data schema would need to be set up, assuming it's simple coordinates
 - send the coordinates to the trip group
 - front end receives the package via its websocket connection and renders it
 - dots of location broadcast can be connected to a line, but would not store them on the DB

> The server only allows a rider to request one trip at a time.

 - during the processing of the `create.trip` message type we query the DB
   for any unfinished trips and decline the creation of a new Trip if we do find
   unfinished trip.
 - The message should include the ID of the unfinished trip so the UI can render
   useful advice to the rider

> The rider can share their trip with another rider, who can join the trip and
> receive updates.

 - calls for a new "route" in `receive_json`
  a) other user is invited: need an identification of the invited rider
     - find them and send them a message about the invitation which he can
       decline or accept
     - decline: relay a message to the host rider to that the invited rider has declined
     - accept: relay a success message to both and add the invited user to the trip group
 - This  requires an update to the Trip model
   - we need to know whom to bill
   - the ForeignKey field needs to be refactored to  M2M relation

   b) user can independently ask to join
    - bad idea

> The server only shares a trip request to drivers in a specific geographic location.

   - we need to collect the location of the users (driver in this case specifically)
   - we need to set radius or calculate a travel time equivalent of a radius
   - with a radius around the pick-up location we can determine which drivers qualify
   - the front end discards trip requests based on this
   - or we create driver groups based on country, state/province/ city

> If no drivers accept the request within a certain timespan, the server cancels
> the request and returns a message to the rider.

 - backend regular job to collect trips with status requested and
  check the timestamp for issue a timeout.
 - email message from that backend job? or how would do it within the communicator?

### 9 UI Support

This part implements a more specific result of the API depending
on what group  a user has. For that, `get_queryset` of the
view set of the Trips view was adjusted.

This helps to keep more relevant information for the logged-in user and
eases the work on the front end.

### 10 User Photos

 - User uploads: media files
 - Route: `MEDIA_URL`
 - Physical Location: `MEDIA_ROOT`, can be path or e.g. Bucket, S3 etc
   Ref: https://docs.djangoproject.com/en/4.2/ref/settings/#media-root
   Ref: https://testdriven.io/blog/storing-django-static-and-media-files-on-amazon-s3/
 - plugged in during development in the project `urlpatterns` with
  `django.conf.urls.static.static`
  Wrapped the extension of `urlpatterns` with check for the `DEBUG` setting
 - **Used during running tests!**
 - extended the `User` model with `models.ImageField`, where we can specificy
   a subdirectory via the `upload_to` kwarg
 - Pillow used to generate an image in a test fixture


Tried to check in admin and the API for trips. But of course, the user
I was using was created before we cared about groups.
We can create the rider and driver group at the admin interface and
assign the `rider` group to our user.

**Todos**:
 - enable the user to change/recover password
 - enable the user to change user profile details (which, he is allowed to change)

## Part 2 The UI - React

### 1 Introduction

The learning objectives are set to be
 
 - Scaffold a React app
 - Functional React components including React Hooks
 - Navigation/routing on our SPA
 - Unit and E2E testing with Cypress
 - Mocking Ajax with Cypress
 - Implement Bootstrap CSS framework
 - Forms
 - Containerize both front and back end
 - Build authentication for end users (sign up, log in)

### 2 React Setup

| package | tutorial | project |
|---------|----------|---------|
| node    | 19.0.0   | 19.8.1  |
| npm     | 8.19.2   | 9.5.1   |
| yarn    | 1.22.17  | 3.5.0   |
|         |          |         |

`yarn` is used to trigger `react-app`

Refs:
 - https://create-react-app.dev/docs/getting-started/
 - https://yarnpkg.com/getting-started/install

Install default dependencies and create a template app:
```sh
# tdd-taxi/client
yarn create react-app client
```

### 2 React Routing

It this part routing will be implemented and enable these "pages"/ view:
 - http://localhost:3000/
 - http://localhost:3000/#/sign-up
 - http://localhost:3000/#/log-in

Routing is one of the key features of SPA IMO.
The tut uses `react-router-dom` to implement routing.

`createHashRouter`, specificaly the `HashRouter` component is used 
Like in the Vue tut, it is equally discouraged to use.

Instead, the `createBrowserRouter` factory or `BrowserRouter` component is recommended in 
the docs.

While it's possible to write the router separately and then plug it in, here
it is included in the `index.js`.

```js
  // src/index.js

    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route index element={<Landing />} />
        <Route path="sign-up" element={<SignUp />} />
        <Route path="log-in" element={<LogIn />} />
      </Routes>
    </HashRouter>
```

Essentially, a URL path is matched to the component which to which the URL should show. 
The `index` keyword is used to mark a "home".

It might be confusing because the "/" route is wired to the  `App` component.
However, the `App` component serves just as an `Outlet` target. This compares to Vue
with placing the `RouterView` component.

```js
// src/App.js
function App() {
  return (
    <>
      <Outlet />
    </>
  );
}
```
`</></>` works as "synthetic" wrapper `div` element.

Refs:
 - `Outlet` : https://reactrouter.com/en/main/components/outlet
 - `index` keyword: https://reactrouter.com/en/6.10.0/route/route#index
 - `HashRouter`: https://reactrouter.com/en/main/routers/create-hash-router
 - `<> </>` https://react.dev/reference/react/Fragment
 - Browser compatability: https://browsersl.ist/#q=%3E+0.2%25%2C+not+dead%2C+not+op_mini+all

### 4 End-to-End Testing with Cypress

Cypress uses a browser to interact with our application from the users' perspective.
If the backend had been plugged in yet, it indeed would cover the complete path of the UX
from the UI to the database (and back) (i.e. end to end, e2e).

#### Setup
First, it needs to be installed:
```sh
yarn add cypress@10.11.0 --dev
```

The UI of Cypress can be started using:
```sh
yarn run cypress open
```

Configuration files are created.
A browser can be chosen to do the testing in.

The `baseUrl` property is set in the `cypress.config.js` to the dev client base URL:

#### Test Code

The test suit is initialized with a coverage of the navigation:
```js
// client/cypress/navigation.cy.js
describe("Navigation", function() {
  // ...
  it('Can navigate to sign up from log in', function () {
      cy.visit('/#/log-in');
      cy.get('a').contains('Sign up').click();
      cy.hash().should('eq', '#/sign-up');
  });
// ...
})
```
As opposed to unit tests, cypress lives its own life in the root client directory
instead of being part of the e.g. the `components` sub folder.

The API was matched by Vue I guess, since React is older.
The test has three statements at its core
1) Navigate to the test subjects page
2) Find the anchor/link element, which contains a pattern and click on it
3) The assertion, which checks the browser URL

The `contains` method is case-sensitive but matches substrings.

### 5 Bootsrap - Styling

#### Setup
```sh
yarn add bootstrap \
           react-bootstrap \
           react-router-bootstrap \
           bootswatch
```

Packages used:

| Package                | Tutorial | Project |
|------------------------|----------|---------|
| bootstrap              | 5.2.2    | 5.2.3   |
| react-bootstrap        | 2.5.0    | 2.7.2   |
| react-router-bootstrap | 0.26.2   | 0.26.2  |
| bootswatch             | 5.2.2    | 5.2.3   |

#### Details

Integration of React Bootsrap components worked flawless compared to Vue3,
there the wrapper library is not ready yet.

Interestingly, subelements are available via `.` syntax:
```js
<Breadcrumb>
  <Breadcrumb.Item href="/#/">Home</Breadcrumb.Item>
  <Breadcrumb.Item active>Log in</Breadcrumb.Item>
</Breadcrumb>
```

Additional context for testing is provided on certain elements via the 
`data-cy` attribute. I guess it will be used later. Anyway, all e2e tests passed.

Check with:
```sh
yarn run cypress open
```

Beautiful 😍

Ref: 
 - Bootstrap: https://getbootstrap.com/
 - Bootrap React components: https://react-bootstrap.github.io/
 - Bootstrap + Router for React: https://github.com/react-bootstrap/react-router-bootstrap
 - Bootstrap themes: https://bootswatch.com/


### Forms

#### Setup

`Formik` is used as a plugin for creating and handling forms.
At this stage, validation is left out. Should be done at least on the backend.
Recall, that any group passed on would be created during sign-up in the default version
of the tutorial. (see `trips.serializers.UserSerializer.validate_group`)

A selection of form related libraries can be found at https://github.com/enaqx/awesome-react#forms

```sh
yarn add formik
# @2.2.9 both in the tutorial and the project
```

#### Example
A basic example without bootstrap:
```js
import React from "react";
import ReactDOM from "react-dom";
import { Formik, Field, Form } from "formik";
import "./styles.css";

function App() {
  return (
    <div className="App">
      <h1>Contact Us</h1>
      <Formik
        initialValues={{ name: "", email: "" }}
        onSubmit={async (values) => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          alert(JSON.stringify(values, null, 2));
        }}
      >
        <Form>
          <Field name="name" type="text" />
          <Field name="email" type="email" />
          <button type="submit">Submit</button>
        </Form>
      </Formik>
    </div>
  );
}
```
Has some validation built in and activated by default 😍
Ref:  https://formik.org/

#### React stuff

**functional component**
 - function, can accept props or not
 - return JSX

**`useState`**

Enable React to react upon a change of a variable The syntax is.
When a new value is set to the variable **using the setter**, it will trigger a re-render
with the new value taken into account.
```js
import { useState } from 'react';

function MyComponent() {
  const [age, setAge] = useState(28);
  const [name, setName] = useState('Taylor');
  const [todos, setTodos] = useState(() => createTodos());
  // ...
```
This explains the redirection logic at the top of the two modified components:


```js
function LogIn(props) {
  const [isSubmitted, setSubmitted] = useState(false);
  const onSubmit = (values, actions) => setSubmitted(true);
  if (isSubmitted) {
    return <Navigate to="/" />;
  }
    return (
      //..
          <Formik
            initialValues={{
              username: "",
              password: "",
            }}
            onSubmit={onSubmit}
          >
      //...
    )
```
1) `isSubmitted` is initially `false`
2) Clicking the submit button will forward the event to the custom `onSubmit` handler.
3) which uses the setter returned by `useState` to change the value of `issubmitted`
4) which triggers a rerender, but a persisting value for `isSubmitted`
5) which return the redirect in the if-clause instead of the default JSX (i.e. sign up form)

Ref: https://react.dev/reference/react/useState

#### Testing

Another dev dependency to handle file uploads
```sh
yarn add cypress-file-upload --dev
# 5.0.8 both in tutorial and project 
```

which is "registered" in `client/cypress/support/e2e.js` with

```js
import "cypress-file-upload";
```

Which enables to interact with a file upload field: via `element.attachFile("images/photo.jpg")`.

#### Todos & Questions

 - `props` is described as a parameter but not accessed.
 - `React` is imported but not used
 - we should confirm the user that he has signed up indicate
   that he can now log in.
 - validation in formik?


### 7 HTTP Requests - Log In and Out


#### Refactoring and Stub for Logging In and Logging Out
The client code was refactored. The routing logic was moved out of the `index.js`
into the App component within the `App.js`.

Interesting: you can neste `<Route></Route>` elements.

Methods and stateful variables were passt to the components during 
initialisation

```js
<MyComponent thePropToPassToTheComponent={methodOrVariable}
```

Conditional parts within the returned JSX by the component:
If `somethingEvaluatedForTruthiness` evaluates to `true` the `OtherTag` will get rendered.
```js
<SomeTag> 
{
    somethingEvaluatedForTruthiness && (<OtherTag>Component</OtherTag>)
}
</SomeTag>
```

When a component takes `props` as a key word, the props set during "instantiation"
will be dot-accessible.
```js
//App.js
// App component
<LogIn logIn={logIn} />

//Login.js
function LogIn(props) {
    props.logIn(values.username, values.password);
  };
```
Otherwise, the props can be explicitly named:

```js
// App Component
<Layout isLoggedIn={isLoggedIn} />

// Layout subcomponent
function Layout({ isLoggedIn }) {
  //...
            {isLoggedIn && (
              <Form>
                <Button type="button">Log out</Button>
              </Form>
            )}
  //...
}
```
#### HTTP via axios

`axios` is used for xhr requests.
```sh
yarn add axios
# 1.1.3 in tutorial and 1.3.5 in project
```
CSRF is going to be a topic for the form submit.
Respective middleware is plugged in with Django apps by default.
```py
MIDDLEWARE = [
    # ...
    "django.middleware.csrf.CsrfViewMiddleware",
    # ...
]
```
Ref: CSRF in Django https://docs.djangoproject.com/en/4.1/ref/csrf/#ajax

The log in route will trigger an XHR request later for now it stubbed.
Some "business" logic was implemented 
 - don't offer the log-in and sign up pages to logged in users
 - alert on an error using bootsrap
 - field specific errors were tied to the `formik` form using `actions.setFieldError`
   Ref: https://formik.org/docs/api/formik#setfielderror-field-string-errormsg-string--void

Additional topics:
 - methods can be called in JSX within parenthesis using wrapping the call in an anonymous function
 - Cypress allows environment variable in `cypress.config.js`. They can be accessed via `Cypress.env("envKeyName")`
 - fixtures/helper function introduced for Cypress
 - `(props)` vs `({ namedProp1, namedProp2 })` introduced
 - `window.storage`
   - storage of auth token in the browser via `window.localStorage.setItem("taxi.auth", JSON.stringify(jsObject))`
     Only strings allowed.
   - reading the auth token via `window.localStorage.getItem("taxi.auth")`
   - log out / removal of auth token via `window.localStorage.removeItem("taxi.auth")`
 - inline if/else `variableEvaluatedForTruthiness ? caseTrue : CaseFalse`

### 8 HTTP Requests - Signing Up

This chapter adds the axios request for the sign-up page and
adds highlighting and feedback for the user on the sign-up form

`FormData` instance is used to handle the actual transmission via API.
Ref.: https://developer.mozilla.org/en-US/docs/Web/API/FormData
Let's see later if it plays nice.

The XHR request was placed in the sign-up component instead of the parent
component bc we don't need the sign-up state in the parent in contrast to
the login status.

In the tutorial, a conditional was set for the classname if the input components to highlight 
the respective field using CSS. The class name `is-invalid` is built in into bootsrap.
Ref.: https://getbootstrap.com/docs/5.0/forms/validation/#server-side

Additionally, `Form.Control.Feedback` of `bootstrap` was used to forward the error message:
```js
<Form.Control ...>
  {
    'username' in errors && (
      <Form.Control.Feedback 
        type='invalid'>
        {errors.username}
      </Form.Control.Feedback>
    )
  }
  //...
```
The `Feedback` subcomponent will inject a `div` with a class attribute set to `invalid`
Ref.: `client/node_modules/react-bootstrap/esm/Feedback.js`

Alternative but worse way to highlight errors `ErrorMessage`:
```js
<Form.Contol name="username" ...>
<ErrorMessage name="username" />
```

### 9 Dockerizing

A `Dockerfile` as created for the `server` and `client` app
with hot reloading by plugging in the code on the disk
using volumes. 
`.dockerignore` files were added to each subproject to avoid 
bloating the image with e.g. node modules and the python virtual env.
Images are not optimized for prod (cleaning of apt-get artefacts, multistage build etc.)

To start the whole project - including the auxiliary service ad `docker-compose` file
was created.
`container_name` directive can be used which will to avoid the default naming scheme
used by docker.

Comments in JSX:
```js
import React from 'react'

const Component = function () {
  return (
    {/* comment in JSX ... not via // ;) */}
  )
}
export default Component
```

Found that I lost code during refactoring.
I miss the unit tests

Docker is cool to find undocumented system dependencies.
Found, that I didn't specify `graphviz` and `graphviz-dev`.

### 10 Adjustments to the Container Setup

#### Tests

In this chapter the Cypress test cases were refactored to avoid mocking
the HTTP requests. I went a step further and removed mores stubs. And it payed off
by discovering some mistakes in wiring the error messages :).

For a production ready app, it would be nice to collect all validation errors
before responding to the front end

#### Faker
Since the app uses the sign-up feature against the backend and the username
has a unique constraint it was necessary to get a unique username for each test run.
Faker was used for get meaningful random values.

The package changed a bit compared to the tutorial.

```sh
yarn add @faker-js/faker --dev
# 7.6.0 in the project vs 5.5.3
```
Ref.: https://fakerjs.dev/guide/

#### Chai via Cypress

Cypress is uses ChaiJS, so the `expect` method is available to make
e.g. non DOM assertions
https://www.chaijs.com/api/bdd/

#### DRYing up Credential Usage

A found few more occasions where a password for the tests were written as literals and
replaced them by using `Cypress.env("credentials")` like suggested in previous chapters.

#### CORS

To avoid cross site attacks CORS is implemented in clients.
For Django, there is the `django-cors-headers` is available.

It evaluates the request for the respective headers/cookies in
a middleware.

Ref.: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

#### Environment Variables in Node

Env values can be read out via `process.env.<THE_ENV_KEY>`

```js
const url = `${process.env.REACT_APP_BASE_URL}/api/sign_up/`;
```

## Part 3

Development goals in this part are going to be:
 - Addding Dashboards for the Driver and Rider roles.
 - Effect hooks to trigger side effects in React components.
 - Work with websockets in React.
 - Toast notification in React
 - Integrate Google Maps API to the app

Alongside, more Cypress test will be added and refactored

### 2 The User

In this Chapter a User Dashboard will be created for a Driver and Rider role, 
which will be accessible only for each specific role.

#### Initial Component for a User Dashboard

Components intended to show some user data were implemented for both groups,
the rider and driver. The routes were placed in the `App` component as a subcomponent.

`Breadcrumbs` were used to display the location. Quite comfortable for browsing
back and forth.
```js
// Home > Dashboard
function Rider(props) {
  // ...
  return (
    <>
      <Breadcrumb>
        <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
        <Breadcrumb.Item active>Dashboard</Breadcrumb.Item>
      </Breadcrumb>
      //..,
    </>
  );
}
```
Ref.: https://react-bootstrap.github.io/components/breadcrumb/

#### Role Based Logic

User details are encoded in the access token, which was stored in `localStorage`.
A logic was implemented in both the ride and driver component to ensure that
the logged-in user is only able to access the page which is designed for his group.

**TODO:**

A user who is not logged in can still visit the page. He will just need
to inject the part of the token with the user details. The details should 
be verified by checking against the signature (third part of the token).
However, any content on that page will require a request to the backend,
which will fail anyway because a valid token was never issued in the first place.

For now, there is an expected error within `getUser` since `JSON.parse` receives
`null` as an argument.

#### Refactoring

Cypress enables reusing code e.g. as part of a setup routine.
One way this already done was the `logIn` function in the `authentication.cy.js` suite.

Another way to do it, is register these reusable functions in `cypress/support/commands.js`

```js
const helper = () => {
    // cy.doSomeThing() ...
};

Cypress.Commands.add("helper", helper);
```

Although, the documentation suggests to define them as part of the `add` method

```js
Cypress.Commands.add("helper", () => {
    // cy.doSomeThing() ...
}
);
```

Both seem to work. While the last one avoids spelling errors during registering
the function, the first one enables local re-usability.

**Error**

At some point, something didn't go as suggested by the tutorial.
Cypress needs to visit the rider or driver dashboard 2x.
Only on the second time, the expected result is returned.
Something is wrong somewhere.

Ref.: https://docs.cypress.io/api/cypress-api/custom-commands

### 3 Loading Trips

The r
#### `URL` object 

Will ensure that we get an absolute URL or let's say not an URI using `URL` object.
```JS console
const photo = "/users/24/photo.jpg";
undefined

const base = "https://example.org"
undefined

new URL(photo, base).href
'https://example.org/users/24/photo.jpg'

const photoAbs = "https://example.org/users/24/photo.jpg";
undefined

new URL(photoAbs, base).href
'https://example.org/users/24/photo.jpg'
```
Ref.: https://developer.mozilla.org/en-US/docs/Web/API/URL/URL


#### `useEffect`

Hook to rerender components on changes. The objects/vars "watched" for changes
need to be specified.

```js
import { useEffect } from 'react';
import { createConnection } from './chat';

function ChatRoom({ roomId }) {
  const [serverUrl, setServerUrl] = useState('https://localhost:1234');

  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.connect();
    return () => {
      connection.disconnect();
    };
  }, [serverUrl, roomId]);
}
```
Ref.: https://react.dev/reference/react/useEffect


#### Trip Data

Unlike in the `LogIn` component we have multiple (2) components which will need
to execute calls to the backend to get trip related data.

So it makes sense to place trip related XHR logic outside a component.
That's why a `TripServer` module is created.

Preferably an autogenerated client would be used. Still, that autogenerated
code needs to be wired up to our app.

**TODO**

I miss a step to validate the incoming schema. That would provide 1) an
abstraction layer from the backend and 2) ease coding since we would get
autocompletion/syntax checking for free.

XHR code could be DRYed up
#### Trip Data Rendering

The stubs in `Rider` and `Driver` components were replaced with a combo of 
`TripCard` and `TripMedia`.

```
Rider/Driver > TripCard > TripMedia
```
Each trip is represented as one `TripMedia` object within the `TripCard` component.
`Card` refers to a Bootstrap component (essentially div with specific formatting).

Ref.: https://getbootstrap.com/docs/5.0/components/card/



#### Bootstrap Shortcuts

Throughout the new (and existing code) shorthand styling directives are used in the 
class name HTML elements.


##### Margin and Padding


For example TripCard returns a `Card` element with the class name `mb-3`

> The classes are named using the format 
> {property}{sides}-{size} for xs and
> {property}{sides}-{breakpoint}-{size} for sm, md, lg, xl, and xxl.

So a margin,
> m - for classes that set margin

is set for the bottom of the element
> b - for classes that set margin-bottom or padding-bottom

equivalent to the default.
> 3 - (by default) for classes that set the margin or padding to $spacer

https://getbootstrap.com/docs/5.0/utilities/spacing/

### 4 Testing Loading Trips

Static "snapshots" where used to mock the returned Trip response.

**TODO:**

 - Assertions could be much more specific.
 - We could test our filtering logic (`getCurrentTrips` etc.)
   by including some "wrong" data. 
 - a tool to create those snapshots would be cool

### 5 Trip Details

In this part, a page for the ride details was implemented.
The details are going to be displayed after a user clicks
on a specific trip within the dashboard which summarizes
all trips.

In the second part a refactoring will be done to the dashboard.

#### Ride Details for the Rider and Driver Role 

`DriverDetail` and `RiderDetail` components are going to be added to
the app.

`client.src.services.TripService.getTrip` was previously implemented to
fetch the data of a specific trip from the backend.

The response will be returned to the `*Detail` component in the
shape of:
```js
{ response, isError: false }
```

The `isError` property helps to separate the XHR logic from the view since 
the service function already evaluated whether the data is good
to render or not.

The data of that request will be cast into the `TripMedia` component and
embedded into a `Card` component of `react-bootstrap`.

Breadcrumbs were used as in the previous upper components.
```js
import { LinkContainer } from 'react-router-bootstrap';
import { Breadcrumb } from 'react-bootstrap';
function DriverDetail() {
  // other code here  
    return (
      <>
        {/*  */}
        <Breadcrumb>
          <LinkContainer to='/driver'>
            <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
          </LinkContainer>
            <Breadcrumb.Item active>Trip</Breadcrumb.Item>
          </Breadcrumb>
      {/*  */}
      </>
    )
}
```

The route to the detail page will be sth like:

`http://localhost:3001/#/driver/492fb009-6178-4837-bfc3-e4822f61ae0f`

The path parameter can be built into the React router by specifying the
param as a value to the `path` attribute with a leading `:`: 

Experimenting around, I found one way to do it is to place the route into the `Routes` component.
```js
// client/src/App.js
<Routes>
  {/* other routs*/}
    <Route path="driver" element={<Driver />}></Route>
    <Route path="driver/:tripId" element={<DriverDetail />}></Route>
</Routes>
```

Obviously, restating the parent route is not optimal.
The next commit includes the official way. 

Ref.: https://reactrouter.com/en/main/hooks/use-params
Ref.: https://www.robinwieruch.de/react-router-nested-routes/

#### Refactoring, proper Route Nesting and RiderDetail

The proper way to nest routes is:

```js
// App.js or whatever the SPA entrypoint component is 
<Routes>
  <Route path="users" element={ UserContainerComponent }>
    <Route index element={ UserLandingOrIndexComponent } />
    <Route path=":dynamicPathParamLikeSomeID" element={ UserDetailComponent } />
  </Route>  
</Routes>
```

In combination with `UserContainerComponent` having:

```js
function UserContainerComponent(props) {
  return <Outlet />
}
```

As a result 
 - logic is moved from `Driver` to `DriverDashboard`
 - `Driver` acts ony as a socket to "Outlet" either `DriverDashboard` or `DriverDetail`

The same pattern is applied to the `Rider` view and rider child views.


**Todos**
 - create an "interface" between the code and the fetched JSON
   with e.g. https://ajv.js.org/guide/getting-started.html
   It would be nice to get code completion like e.g. if a
   pydantic schema is uses to define a response schema with e.g. fastapi 
   only in JS :)
 - The response schema could be pulled in from auto generated OpenAPI
   schema created on the django side.
   A complete API schema would include response/request
   body schemata which could then be used in the React app
   for validation (https://jsontypedef.com/)
    - https://github.com/axnsan12/drf-yasg/
    - https://github.com/tfranzel/drf-spectacular

































