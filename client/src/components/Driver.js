import React from "react";
import { Breadcrumb, Card } from "react-bootstrap";
import { isDriver } from "../services/AuthService";
import { Navigate } from "react-router-dom";

function Driver(props) {
  if (!isDriver()) {
    return <Navigate to="/" />;
  }
  return (
    <>
      <Breadcrumb>
        <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
        <Breadcrumb.Item active>Dashboard</Breadcrumb.Item>
      </Breadcrumb>
      <Card className="mb-3">
        <Card.Header>Current Trip</Card.Header>
        <Card.Body>No trips.</Card.Body>
      </Card>
      <Card className="mb-3">
        <Card.Header>Requested Trips</Card.Header>
        <Card.Body>No trips.</Card.Body>
      </Card>
      <Card className="mb-3">
        <Card.Header>Recent Trips</Card.Header>
        <Card.Body>No trips.</Card.Body>
      </Card>
    </>
  );
}

export default Driver;
