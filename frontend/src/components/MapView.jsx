import { useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { fetchBusEta } from "../api";

function busIcon(color = "#1C7293") {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      width:26px;height:26px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
      border:2px solid white;font-size:14px;">🚌</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function BusPopupContent({ bus }) {
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(false);

  function loadEta() {
    if (eta || loading) return;
    setLoading(true);
    fetchBusEta(bus._id)
      .then((data) => setEta(data.upcoming))
      .catch(() => setEta([]))
      .finally(() => setLoading(false));
  }

  return (
    <div onMouseEnter={loadEta} onClick={loadEta}>
      <strong>{bus.regNumber}</strong>
      <br />
      Speed: {bus.speedKmph ?? 0} km/h
      <br />
      Status: {bus.status}
      <hr style={{ margin: "6px 0" }} />
      <strong>Upcoming stops</strong>
      {loading && <div>Loading ETA...</div>}
      {eta && eta.length === 0 && <div>No upcoming stops.</div>}
      {eta &&
        eta.map((s) => (
          <div key={s.stopName}>
            {s.stopName}: ~{s.etaMinutes} min ({s.distanceKm} km)
          </div>
        ))}
    </div>
  );
}

export default function MapView({ routeDetail, buses }) {
  const center = routeDetail?.path?.[0]
    ? [routeDetail.path[0].lat, routeDetail.path[0].lng]
    : [22.5726, 88.3639];

  return (
    <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {routeDetail?.path?.length > 1 && (
        <Polyline
          positions={routeDetail.path.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: "#065A82", weight: 4, dashArray: "6 8" }}
        />
      )}

      {routeDetail?.stops?.map((stop) => (
        <CircleMarker
          key={stop.name + stop.sequence}
          center={[stop.lat, stop.lng]}
          radius={7}
          pathOptions={{ color: "#E4572E", fillColor: "#E4572E", fillOpacity: 1 }}
        >
          <Popup>Stop: {stop.name}</Popup>
        </CircleMarker>
      ))}

      {buses
        .filter((b) => b.currentLocation?.lat != null)
        .map((bus) => (
          <Marker key={bus._id} position={[bus.currentLocation.lat, bus.currentLocation.lng]} icon={busIcon()}>
            <Popup>
              <BusPopupContent bus={bus} />
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
