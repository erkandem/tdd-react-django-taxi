import React from "react";
import { Link } from "react-router-dom";

function SignUp(props) {
  return (
    <>
      <Link to="/">Home</Link>
      <h1>Sign Up</h1>
      <p>
        Already have an account? <Link to="/log-in">Log In!</Link>
      </p>
    </>
  );
}

export default SignUp;
