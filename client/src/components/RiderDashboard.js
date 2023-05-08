import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Breadcrumb, Button } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import { toast } from "react-toastify";
import { tripStatusChoices, userGroupChoices } from "../utils/constants";
import { getTrips, connect, messages } from "../services/TripService";
import { isRider } from "../services/AuthService";
import TripCard from "./TripCard";

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
      updateToast(message.data);
    });
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [setTrips]);

  const updateToast = (trip) => {
    if (trip === null) {
      return;
    }
    if (trip.status === "REQUESTED") {
      toast.info(`Requested a trip`);
      return;
    }
    const driverName = `${trip.driver.first_name} ${trip.driver.last_name}`;
    if (trip.status === "STARTED") {
      toast.info(`${driverName} is coming to pick you up.`);
    } else if (trip.status === "IN_PROGRESS") {
      toast.info(`${driverName} is headed to your destination.`);
    } else if (trip.status === "COMPLETED") {
      toast.info(`${driverName} has dropped you off.`);
    }
  };
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
