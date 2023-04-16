import React, { useEffect, useState } from "react";
import { Breadcrumb, Card } from "react-bootstrap";
import { isDriver } from "../services/AuthService";
import { Navigate } from "react-router-dom";
import TripCard from "./TripCard";
import { getTrips } from "../services/TripService";
import { tripStatusChoices, userGroupChoices } from "../utils/constants";

function Driver(props) {
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

export default Driver;
