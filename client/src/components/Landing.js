import React from "react";
import { Link } from "react-router-dom";

function Landing(props) {
  return (
    <div>
      <h1>Taxi</h1>
      <Link to="/sign-up">Sign up</Link>
      <Link to="/log-in">Log in</Link>
    </div>
  );
}

export default Landing;
