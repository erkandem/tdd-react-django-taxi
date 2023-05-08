import { faker } from "@faker-js/faker";
import { userGroupChoices } from "../../src/utils/constants";

const driverEmail = faker.internet.email();
const driverFirstName = faker.name.firstName();
const driverLastName = faker.name.lastName();
const riderEmail = faker.internet.email();
const riderFirstName = faker.name.firstName();
const riderLastName = faker.name.lastName();
const addressA = faker.address.streetAddress();
const addressB = faker.address.streetAddress();
const { password } = Cypress.env("credentials");

describe("Trips", () => {
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

  it("Can receive trip status updates", () => {
    cy.intercept("trip").as("getTrips");

    cy.logIn(riderEmail, password);
    // we don't ask to visit the rider dashboard
    // bc the login form was wired to redirect us to
    // the landing page, where request link is accesses from
    // the nav menu
    cy.get("[data-cy=request-trip]").click(); // get to the request form
    cy.get("[data-cy=pick-up-address]").type(addressA);
    cy.get("[data-cy=drop-off-address]").type(addressB);
    cy.get("[data-cy=submit]").click();
    cy.wait("@getTrips");
    cy.hash().should("eq", "#/rider");
    cy.contains("button", "Log out").click();

    // accept the ride request
    cy.logIn(driverEmail, password);
    cy.get("[data-cy=dashboard]").click();
    cy.wait("@getTrips");
    cy.contains("h5", riderFirstName)
      .parent()
      .parent()
      .parent()
      .find("a")
      .contains("Detail")
      .click();
    cy.get("div.card-footer > div > button").click();
    cy.contains("button", "Log out").click();

    // confirm on the riders' account that the requested trip
    // has a "STARTED" status and
    cy.logIn(riderEmail, password);
    cy.get("[data-cy=dashboard]").click();
    cy.wait("@getTrips");
    cy.get("[data-cy=trip-card]").eq(0).contains("STARTED");
  });
});
