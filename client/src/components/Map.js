import React, { useState, useRef } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  DirectionsService,
  DirectionsRenderer,
} from "@react-google-maps/api";

function Map({ pickUpAddress, dropOffAddress, lat, lng, zoom }) {
  const [response, setResponse] = useState(null);
  const hasTwoAddresses = pickUpAddress !== "" && dropOffAddress !== "";
  const count = useRef(0);
  const directionsCallback = (response) => {
    /*
    small deviation from the tutorial to avoid false re-renders even
    though a
    */
    if (response !== null && response.status === "OK" && count.current <= 2) {
      setResponse(response);
      count.current += 1;
    } else {
      count.current = 0;
    }
  };
  return (
    <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_KEY}>
      <GoogleMap
        center={{ lat, lng }}
        mapContainerStyle={{
          width: "100%",
          height: "350px",
          marginBottom: "10px",
        }}
        zoom={zoom}
      >
        {hasTwoAddresses && (
          <DirectionsService
            options={{
              origin: pickUpAddress,
              destination: dropOffAddress,
              travelMode: "DRIVING",
            }}
            callback={directionsCallback}
          />
        )}
        {hasTwoAddresses && response !== null && (
          <DirectionsRenderer
            options={{
              directions: response,
            }}
          />
        )}
        {!hasTwoAddresses && <Marker label="A" position={{ lat, lng }} />}
      </GoogleMap>
    </LoadScript>
  );
}

export default Map;
