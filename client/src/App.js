import React, { useState } from "react";
import { Container, Navbar, Button, Form } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import { Outlet, Route, Routes } from "react-router-dom";
import "./App.css";
import Landing from "./components/Landing";
import SignUp from "./components/SignUp";
import LogIn from "./components/LogIn";

import axios from "axios";

function App() {
  // not an issue bc the actual credentials
  // for the API are signed by our backend
  const [isLoggedIn, setLoggedIn] = useState(() => {
    return window.localStorage.getItem("taxi.auth") !== null;
  });

  const logIn = async (username, password) => {
    const url = `${process.env.REACT_APP_BASE_URL}/api/log_in/`;
    try {
      const response = await axios.post(url, { username, password });
      window.localStorage.setItem("taxi.auth", JSON.stringify(response.data));
      setLoggedIn(true);
      return { response, isError: false };
    } catch (error) {
      console.error(error);
      return { response: error, isError: true };
    }
  };
  const logOut = () => {
    window.localStorage.removeItem("taxi.auth");
    setLoggedIn(false);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={<Layout isLoggedIn={isLoggedIn} logOut={logOut} />}
      >
        <Route index element={<Landing isLoggedIn={isLoggedIn} />} />
        <Route path="sign-up" element={<SignUp isLoggedIn={isLoggedIn} />} />
        <Route
          path="log-in"
          element={<LogIn isLoggedIn={isLoggedIn} logIn={logIn} />}
        />
      </Route>
    </Routes>
  );
}

function Layout({ isLoggedIn, logOut }) {
  return (
    <>
      <Navbar bg="light" expand="lg" variant="light">
        <Container>
          <LinkContainer to="/">
            <Navbar.Brand className="logo">Taxi</Navbar.Brand>
          </LinkContainer>
          <Navbar.Toggle />
          <Navbar.Collapse className="justify-content-end">
            {isLoggedIn && (
              <Form>
                <Button type="button" data-cy="logOut" onClick={() => logOut()}>
                  Log out
                </Button>
              </Form>
            )}
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container className="pt-3">
        <Outlet />
      </Container>
    </>
  );
}

export default App;
