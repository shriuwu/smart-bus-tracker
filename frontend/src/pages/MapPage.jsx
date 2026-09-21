import { useEffect, useState } from "react";
import { fetchRoutes, fetchRouteDetail, fetchBuses } from "../api";
import { socket } from "../socket";
import MapView from "../components/MapView";
import NotificationsFeed from "../components/NotificationsFeed";

export default function MapPage() {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [routeDetail, setRouteDetail] = useState(null);
  const [buses, setBuses] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRoutes()
      .then((r) => {
        setRoutes(r);
        if (r.length > 0) setSelectedRouteId(r[0]._id);
      })
      .catch((e) => setError(e.message));

    fetchBuses().then(setBuses).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selectedRouteId) return;
    fetchRouteDetail(selectedRouteId).then(setRouteDetail).catch((e) => setError(e.message));
  }, [selectedRouteId]);

  useEffect(() => {
    function handleUpdate(data) {
      setBuses((prev) =>
        prev.map((bus) =>
          bus._id === data.busId
            ? { ...bus, currentLocation: { lat: data.lat, lng: data.lng }, speedKmph: data.speedKmph, status: "active" }
            : bus
        )
      );
    }
    socket.on("busLocationUpdate", handleUpdate);
    return () => socket.off("busLocationUpdate", handleUpdate);
  }, []);

  const busesOnSelectedRoute = buses.filter((b) => (b.route?._id || b.route) === selectedRouteId);

  return (
    <div className="page-shell">
      <div className="page-toolbar">
        <select value={selectedRouteId || ""} onChange={(e) => setSelectedRouteId(e.target.value)}>
          {routes.map((r) => (
            <option key={r._id} value={r._id}>
              Route {r.routeCode} — {r.routeName}
            </option>
          ))}
        </select>
        <span className="page-toolbar-info">
          {busesOnSelectedRoute.length} bus(es) live · hover a bus marker for ETA
        </span>
      </div>

      {error && <div className="app-error">⚠ {error} — is the backend running on port 5000?</div>}

      <div className="page-map">
        <MapView routeDetail={routeDetail} buses={busesOnSelectedRoute} />
        <NotificationsFeed />
      </div>
    </div>
  );
}
