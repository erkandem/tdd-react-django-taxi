import React, { useEffect, useState } from "react";
import { getTrips } from "../services/TripService";
import { isRider } from "../services/AuthService";
import { Navigate } from "react-router-dom";
import { tripStatusChoices, userGroupChoices } from "../utils/constants";
import { Breadcrumb, Button } from "react-bootstrap";
import TripCard from "./TripCard";
import { LinkContainer } from "react-router-bootstrap";
import { connect, messages } from "../services/TripService";

function RiderDashboard() {
  const [trips, setTrips] = useState([]);
  useEffect(() => {
    const loadTrips = async () => {
      const { response, isError } = await getTrips();
      if (isError) {
        setTrips([]);
      } else {
        setTrips(response.data);
      }
    };
    loadTrips();
  }, []);
  useEffect(() => {
    connect();
    const subscription = messages.subscribe((message) => {
      setTrips((prevTrips) => [
        ...prevTrips.filter((trip) => trip.id !== message.data.id),
        message.data,
      ]);
    });
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [setTrips]);

  if (!isRider()) {
    return <Navigate to="/" />;
  }

  const getCurrentTrips = () => {
    return trips.filter((trip) => {
      return (
        trip.driver !== null &&
        trip.status !== tripStatusChoices.requested.literal &&
        trip.status !== tripStatusChoices.completed.literal
      );
    });
  };

  const getCompletedTrips = () => {
    return trips.filter((trip) => {
      return trip.status === tripStatusChoices.completed.literal;
    });
  };
  return (
    <>
      <Breadcrumb>
        <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
        <Breadcrumb.Item active>Dashboard</Breadcrumb.Item>
      </Breadcrumb>
      <LinkContainer to="/rider/request">
        <Button variant="success">Request a Ride</Button>
      </LinkContainer>

      <TripCard
        title="Current Trip"
        trips={getCurrentTrips()}
        group={userGroupChoices.rider.literal}
        otherGroup={userGroupChoices.driver.literal}
      />
      <TripCard
        title="Recent Trips"
        trips={getCompletedTrips()}
        group={userGroupChoices.rider.literal}
        otherGroup={userGroupChoices.driver.literal}
      />
    </>
  );
}

export default RiderDashboard;