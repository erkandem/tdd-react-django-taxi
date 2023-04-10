const logIn = () => {
  const { username, password } = Cypress.env("credentials");

  // Capture HTTP requests.
  cy.intercept("POST", "log_in", {
    statusCode: 200,
    body: {
      access: "ACCESS_TOKEN",
      refresh: "REFRESH_TOKEN",
    },
  }).as("logIn");

  // Log into the app.
  cy.visit("/#/log-in");
  cy.get("input#username").type(username);
  cy.get("input#password").type(password, { log: false });
  cy.get("button").contains("Log in").click();
  cy.wait("@logIn");
};

describe("Authentication", function () {
  it("Shows an alert on login error.", function () {
    const { username, password } = Cypress.env("credentials");
    cy.intercept("POST", "log_in", {
      statusCode: 400,
      body: {
        __all__: [
          "Please enter a correct username and password. " +
            "Note that both fields may be case-sensitive.",
        ],
      },
    }).as("logIn");
    cy.visit("/#/log-in");
    cy.get("input#username").type(username);
    cy.get("input#password").type(password, { log: false });
    cy.get("button").contains("Log in").click();
    cy.wait("@logIn");
    cy.get("div.alert").contains(
      "Please enter a correct username and password. " +
        "Note that both fields may be case-sensitive."
    );
    cy.hash().should("eq", "#/log-in");
  });

  it("Can log in.", function () {
    logIn();
    cy.hash().should("eq", "#/");
    // business logic is to show the log-out button
    // for logged-in users
    cy.get("button").contains("Log out");
  });

  it("Can sign up.", function () {
    cy.visit("/#/sign-up");
    cy.get("input#username").type("gary.cole@example.com");
    cy.get("input#firstName").type("Gary");
    cy.get("input#lastName").type("Cole");
    cy.get("input#password").type("pAssw0rd", { log: false });
    cy.get("select#group").select("driver");
    cy.get("input#photo").attachFile("images/photo.jpg");
    cy.get("button").contains("Sign up").click();
    cy.hash().should("eq", "#/log-in");
  });

  it("Can not visit the login page when logged in.", function () {
    logIn();
    cy.visit("/#/log-in");
    cy.hash().should("eq", "#/");
  });

  it("Can not visit the sign up page when logged in.", function () {
    logIn();
    cy.visit("/#/sign-up");
    cy.hash().should("eq", "#/");
  });

  it("Cannot see links when logged in.", function () {
    logIn();
    cy.get('[data-cy="signUp"]').should("not.exist");
    cy.get('[data-cy="logIn"]').should("not.exist");
  });

  it("Can log out.", function () {
    logIn();
    cy.get('[data-cy="logOut"]')
      .click()
      .should(() => {
        expect(window.localStorage.getItem("taxi.auth")).to.be.null;
      });
    cy.get('[data-cy="logOut"]').should("not.exist");
  });
});
