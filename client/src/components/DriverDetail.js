import React, { useEffect, useState } from "react";
import { Breadcrumb, Card } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import { useParams } from "react-router-dom";

import TripMedia from "./TripMedia";
import { getTrip } from "../services/TripService";

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

  let tripMedia;

  if (trip === null) {
    // TODO: Could be changed to a spinner gif
    //       or a pulsating outline of the layout like twitter/fb/etc
    tripMedia = <>Loading...</>;
  } else {
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
      </Card>
    </>
  );
}

export default DriverDetail;
