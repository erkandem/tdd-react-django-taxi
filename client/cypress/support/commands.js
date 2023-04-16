// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

const addUser = (username, password, firstName, lastName, group) => {
  cy.intercept("POST", "sign_up").as("signUp");
  cy.visit("/#/sign-up");
  cy.get("input#username").type(username);
  cy.get("input#password").type(password, { log: false });
  cy.get("input#firstName").type(firstName);
  cy.get("input#lastName").type(lastName);
  cy.get("select#group").select(group);
  cy.get("input#photo").attachFile("images/photo.jpg");
  cy.get("button").contains("Sign up").click();
  cy.wait("@signUp");
  cy.hash().should("eq", "#/log-in");
};

const logIn = (username, password) => {
  cy.intercept("POST", "log_in").as("logIn");
  cy.visit("/#/log-in");
  cy.get("input#username").type(username);
  cy.get("input#password").type(password, { log: false });
  cy.get("button").contains("Log in").click();
  cy.wait("@logIn");
};

const logOut = () => {
  cy.get('[data-cy="logOut"]')
    .click()
    .should(() => {
      expect(window.localStorage.getItem("taxi.auth")).to.be.null;
    });
};

Cypress.Commands.add("addUser", addUser);
Cypress.Commands.add("logIn", logIn);
Cypress.Commands.add("logOut", logOut);
