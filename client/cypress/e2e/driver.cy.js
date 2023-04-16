import { faker } from "@faker-js/faker";
import userGroupChoices from "../../src/utils/constants";

const driverEmail = faker.internet.email();
const driverFirstName = faker.name.firstName();
const driverLastName = faker.name.lastName();
const riderEmail = faker.internet.email();
const riderFirstName = faker.name.firstName();
const riderLastName = faker.name.lastName();
const { password } = Cypress.env("credentials");

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
});
