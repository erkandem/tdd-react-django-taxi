import React, { useState } from "react";
import { createTrip } from "../services/TripService";
import { Formik } from "formik";
import { Button, Form, Card, Breadcrumb } from "react-bootstrap";
import { Navigate } from "react-router-dom";
import { LinkContainer } from "react-router-bootstrap";
import { getUser } from "../services/AuthService";

function RiderRequest() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const onSubmit = (values, actions) => {
    const currentUser = getUser();
    console.log("current user.", currentUser);
    createTrip({
      pick_up_address: values.pickUpAddress,
      drop_off_address: values.dropOffAddress,
      rider: getUser().id,
    });
    setIsSubmitted(true);
  };
  if (isSubmitted) {
    return <Navigate to="/rider" />;
  }
  return (
    <>
      <Breadcrumb>
        <LinkContainer to="/">
          <Breadcrumb.Item>Home</Breadcrumb.Item>
        </LinkContainer>
        <LinkContainer to="/rider">
          <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
        </LinkContainer>
        <Breadcrumb.Item active>Request a Ride</Breadcrumb.Item>
      </Breadcrumb>

      <Card className="mb">
        <Card.Header>Request a Trip</Card.Header>
        <Card.Body>
          <Formik
            initialValues={{
              pickUpAddress: "",
              dropOffAddress: "",
            }}
            onSubmit={onSubmit}
          >
            {({ errors, handleChange, handleSubmit, isSubmitting, values }) => (
              <Form noValidate onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="pickUpAddress">
                  <Form.Label>Pick up address:</Form.Label>
                  <Form.Control
                    name="pickUpAddress"
                    data-cy="pick-up-address"
                    onChange={handleChange}
                    value={values.pickUpAddress}
                    required
                  />
                  {"pickUpAddress" in errors && (
                    <Form.Control.Feedback type="invalid">
                      {errors.pickUpAddress}
                    </Form.Control.Feedback>
                  )}
                </Form.Group>

                <Form.Group className="mb-3" controlId="dropOffAddress">
                  <Form.Label>Drop off address:</Form.Label>
                  <Form.Control
                    name="dropOffAddress"
                    data-cy="drop-off-address"
                    onChange={handleChange}
                    value={values.dropOffAddress}
                    required
                  />
                  {"dropOffAddress" in errors && (
                    <Form.Control.Feedback type="invalid">
                      {errors.dropOffAddress}
                    </Form.Control.Feedback>
                  )}
                </Form.Group>
                <div className="d-grid">
                  <Button
                    disabled={isSubmitting}
                    type="submit"
                    data-cy="submit"
                    variant="primary"
                  >
                    Submit
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </Card.Body>
      </Card>
    </>
  );
}

export default RiderRequest;
