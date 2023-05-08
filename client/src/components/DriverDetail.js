import React, { useEffect, useState } from "react";
import { Breadcrumb, Card, Button } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import { useParams } from "react-router-dom";

import TripMedia from "./TripMedia";
import { getTrip, updateTrip } from "../services/TripService";
import { getUser } from "../services/AuthService";

const createData = (status) => {
  /*
  Gives us data on how to render a component depending on the current trip status.
  */
  switch (status) {
    case "REQUESTED":
      return {
        disabled: false,
        message: "Drive to pick up",
        nextStatus: "STARTED",
        variant: "primary",
      };
    case "STARTED":
      return {
        disabled: false,
        message: "Drive to drop off",
        nextStatus: "IN_PROGRESS",
        variant: "primary",
      };
    case "IN_PROGRESS":
      return {
        disabled: false,
        message: "Complete trip",
        nextStatus: "COMPLETED",
        variant: "primary",
      };
    default:
      return {
        disabled: true,
        message: "Completed",
        nextStatus: null,
        variant: "success",
      };
  }
};

function DriverDetail() {
  const [trip, setTrip] = useState(null);
  const params = useParams();

  useEffect(() => {
    const loadTrip = async (tripId) => {
      const { response, isError } = await getTrip(tripId);
      if (isError) {
        setTrip(null);
      } else {
        setTrip(response.data);
      }
    };
    loadTrip(params.tripId);
  }, [params]);

  const updateTripStatus = (status) => {
    const driver = getUser();
    const updatedTrip = { ...trip, driver, status };
    updateTrip({
      ...updatedTrip,
      driver: updatedTrip.driver.id,
      rider: updatedTrip.rider.id,
    });
    // TODO: On a real app, we would like to verify that our
    //       request was successful. Otherwise, updating it locally
    //       without verification can irritate a user.
    //       Could be fixed by listening on the response message
    //       from the backend and either going forward with the UI update
    //       or communicating the error to the user and what to do about the error.
    setTrip(updatedTrip);
  };

  let data;
  let tripMedia;

  if (trip === null) {
    // TODO: Could be changed to a spinner gif
    //       or a pulsating outline of the layout like twitter/fb/etc
    data = null;
    tripMedia = <>Loading...</>;
  } else {
    data = createData(trip.status);
    tripMedia = <TripMedia trip={trip} otherGroup="rider" />;
  }

  return (
    <>
      <Breadcrumb>
        <LinkContainer to="/">
          <Breadcrumb.Item>Home</Breadcrumb.Item>
        </LinkContainer>
        <LinkContainer to="/driver">
          <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
        </LinkContainer>
        <Breadcrumb.Item active>Trip {params.tripId} </Breadcrumb.Item>
      </Breadcrumb>
      <Card className="mb-3" data-cy="trip-card">
        <Card.Header>Trip</Card.Header>
        <Card.Body>{tripMedia}</Card.Body>
        {trip !== null &&
          data !== null && ( // It's clear from the code above the trip and data are tied together. The additional check helps the IDE to remove a false positive warning on an undefined property.
            <Card.Footer>
              <div className="d-grid">
                <Button
                  data-cy="status-button"
                  disabled={data.disabled}
                  variant={data.variant}
                  onClick={() => updateTripStatus(data.nextStatus)}
                >
                  {data.message}
                </Button>
              </div>
            </Card.Footer>
          )}
      </Card>
    </>
  );
}

export default DriverDetail;
