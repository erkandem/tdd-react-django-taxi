import React, { useEffect, useState } from "react";
import { getTrips } from "../services/TripService";
import { isRider } from "../services/AuthService";
import { Navigate } from "react-router-dom";
import { tripStatusChoices, userGroupChoices } from "../utils/constants";
import { Breadcrumb } from "react-bootstrap";
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
