import { faker } from "@faker-js/faker";
import userGroupChoices from "../../src/utils/constants";

const driverEmail = faker.internet.email();
const driverFirstName = faker.name.firstName();
const driverLastName = faker.name.lastName();

const riderEmail = faker.internet.email();
const riderFirstName = faker.name.firstName();
const riderLastName = faker.name.lastName();
const { password } = Cypress.env("credentials");

describe("The rider dashboard", () => {
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
  it("Cannot be visited if the user is not a rider", () => {
    cy.logIn(driverEmail, password);
    // check if the user gets redirected to the index route
    cy.visit("/#/rider");
    cy.visit("/#/rider");
    cy.hash().should("eq", "#/");
    cy.logOut();
  });
  it("Can be visited if the user is a rider", function () {
    cy.logIn(riderEmail, password);
    // ensure we can reach  the rider dashboard
    cy.visit("/#/rider");
    cy.visit("/#/rider");

    cy.hash().should("eq", "#/rider");
    cy.logOut();
  });
});
