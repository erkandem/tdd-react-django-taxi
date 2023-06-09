import React, { useEffect, useState } from "react";
import { connect, getTrips, messages } from "../services/TripService";
import { isDriver } from "../services/AuthService";
import { Navigate } from "react-router-dom";
import { tripStatusChoices, userGroupChoices } from "../utils/constants";
import { Breadcrumb } from "react-bootstrap";
import { toast } from "react-toastify";
import TripCard from "./TripCard";

function DriverDashboard(props) {
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
    // setup
    connect();
    const subscription = messages.subscribe((message) => {
      setTrips((prevTrips) => [
        ...prevTrips.filter((trip) => trip.id !== message.data.id),
        message.data,
      ]);
      updateToast(message.data);
    });
    // cleanup
    return () => {
      subscription.unsubscribe();
    };
    // dependencies from outer scope used within ``useEffect``
    // and dependencies
  }, [setTrips]);

  const updateToast = (trip) => {
    const riderName = `${trip.rider.first_name} ${trip.rider.last_name}`;
    if (trip.driver === null) {
      toast.info(`${riderName} has requested a trip.`);
    }
  };

  if (!isDriver()) {
    return <Navigate to="/" />;
  }

  const getCurrentTrips = () => {
    return trips.filter((trip) => {
      return (
        trip.driver !== null &&
        trip.status !== tripStatusChoices.completed.literal
      );
    });
  };

  const getRequestedTrips = () => {
    return trips.filter((trip) => {
      return trip.status === tripStatusChoices.requested.literal;
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
      <TripCard
        title="Current Trip"
        trips={getCurrentTrips()}
        group={userGroupChoices.driver.literal}
        otherGroup={userGroupChoices.rider.literal}
      />
      <TripCard
        title="Requested Trips"
        trips={getRequestedTrips()}
        group={userGroupChoices.driver.literal}
        otherGroup={userGroupChoices.rider.literal}
      />
      <TripCard
        title="Recent Trips"
        trips={getCompletedTrips()}
        group={userGroupChoices.driver.literal}
        otherGroup={userGroupChoices.rider.literal}
      />
    </>
  );
}

export default DriverDashboard;
