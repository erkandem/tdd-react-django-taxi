import { faker } from "@faker-js/faker";
import { userGroupChoices } from "../../src/utils/constants";

const driverEmail = faker.internet.email();
const driverFirstName = faker.name.firstName();
const driverLastName = faker.name.lastName();
const riderEmail = faker.internet.email();
const riderFirstName = faker.name.firstName();
const riderLastName = faker.name.lastName();
const { password } = Cypress.env("credentials");
const tripResponse = [
  {
    id: "94fc5eba-de7a-44b2-8000-856ec824609d",
    created: "2020-08-18T21:41:08.112946Z",
    updated: "2020-08-18T21:41:08.112986Z",
    pick_up_address: "A",
    drop_off_address: "B",
    status: "STARTED",
    driver: {
      id: 113,
      first_name: driverFirstName,
      last_name: driverLastName,
      photo: "http://localhost:8003/media/photos/photo_QI0TTYh.jpg",
    },
    rider: {
      id: 112,
      first_name: riderFirstName,
      last_name: riderLastName,
      photo: "http://localhost:8003/media/photos/photo_r3XrvgH.jpg",
    },
  },
  {
    id: "bb3042cd-88dd-472c-890f-c5f59481de01",
    created: "2020-08-18T21:41:08.112946Z",
    updated: "2020-08-18T21:41:08.112986Z",
    pick_up_address: "A",
    drop_off_address: "B",
    status: "REQUESTED",
    driver: {
      id: 113,
      first_name: driverFirstName,
      last_name: driverLastName,
      photo: "http://localhost:8003/media/photos/photo_QI0TTYh.jpg",
    },
    rider: {
      id: 112,
      first_name: riderFirstName,
      last_name: riderLastName,
      photo: "http://localhost:8003/media/photos/photo_r3XrvgH.jpg",
    },
  },
  {
    id: "50e0034f-0696-4b26-9068-8a7d064db922",
    created: "2020-08-18T21:41:08.112946Z",
    updated: "2020-08-18T21:41:08.112986Z",
    pick_up_address: "A",
    drop_off_address: "B",
    status: "COMPLETED",
    driver: {
      id: 113,
      first_name: driverFirstName,
      last_name: driverLastName,
      photo: "http://localhost:8003/media/photos/photo_QI0TTYh.jpg",
    },
    rider: {
      id: 112,
      first_name: riderFirstName,
      last_name: riderLastName,
      photo: "http://localhost:8003/media/photos/photo_r3XrvgH.jpg",
    },
  },
];

describe("The driver dashboard", function () {
  before(() => {
    cy.addUser(
      driverEmail,
      password,
      driverFirstName,
      driverLastName,
      userGroupChoices.driver.literal
    );
    cy.addUser(
      riderEmail,
      password,
      riderFirstName,
      riderLastName,
      userGroupChoices.rider.literal
    );
  });

  it("Cannot be visited if the user is not a driver", function () {
    cy.logIn(riderEmail, password);
    // check if we get the redirection to the landing page
    cy.visit("/#/driver");
    cy.visit("/#/driver");

    cy.hash().should("eq", "#/");
    cy.logOut();
  });

  it("Can be visited if the user is a driver", function () {
    cy.logIn(driverEmail, password);
    // check if we get redirected to the driver dashboard
    cy.visit("/#/driver");
    cy.visit("/#/driver");
    cy.hash().should("eq", "#/driver");
    cy.logOut();
  });

  it("Displays messages for no trips", function () {
    cy.intercept("GET", "/api/trip/", {
      // TODO: removal of the stub will create headeaches
      //       inspected the request the token in the authorization
      //       header was set to `undefined` =/
      statusCode: 200,
      body: [],
    }).as("getTrips");
    // TODO: The following was described with errors on the tutorial
    cy.logIn(driverEmail, password);
    cy.visit("/#/driver");
    cy.visit("/#/driver");
    cy.wait("@getTrips");
    // Current trips.
    cy.get("[data-cy=trip-card]").eq(0).contains("No trips.");
    // Requested Trips.
    cy.get("[data-cy=trip-card]").eq(1).contains("No trips.");
    // Completed trips.
    cy.get("[data-cy=trip-card]").eq(2).contains("No trips.");
  });

  it("Displays current, requested, and completed trips", function () {
    cy.intercept("GET", "api/trip/", {
      statusCode: 200,
      body: tripResponse,
    }).as("getTrips");

    cy.logIn(driverEmail, password);

    cy.visit("/#/driver");
    cy.visit("/#/driver");
    cy.wait("@getTrips");

    // Current trips.
    cy.get("[data-cy=trip-card]").eq(0).contains("STARTED");

    // Requested trips.
    cy.get("[data-cy=trip-card]").eq(1).contains("REQUESTED");

    // Completed trips.
    cy.get("[data-cy=trip-card]").eq(2).contains("COMPLETED");
  });

  it("Shows details about a trip", () => {
    cy.intercept("/api/trip/*", {
      statusCode: 200,
      body: tripResponse[0],
    }).as("getTrip");

    cy.logIn(driverEmail, password);

    cy.visit(`/#/driver/${tripResponse[0].id}`);
    cy.visit(`/#/driver/${tripResponse[0].id}`);
    cy.wait("@getTrip");

    cy.get("[data-cy=trip-card]")
      .should("have.length", 1)
      .and("contain.text", "STARTED");
  });
});
