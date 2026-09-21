import { useEffect, useState } from "react";
import {
  fetchAdminOverview,
  fetchRoutes,
  fetchBuses,
  createBus,
  updateBus,
  deleteBus,
  deleteRoute,
} from "../api";

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [error, setError] = useState(null);

  // new-bus form state
  const [newBus, setNewBus] = useState({ regNumber: "", driverName: "", capacity: 40, route: "" });

  function loadAll() {
    fetchAdminOverview().then(setOverview).catch((e) => setError(e.message));
    fetchRoutes().then(setRoutes).catch((e) => setError(e.message));
    fetchBuses().then(setBuses).catch((e) => setError(e.message));
  }

  useEffect(loadAll, []);

  async function handleCreateBus(e) {
    e.preventDefault();
    setError(null);
    try {
      await createBus({ ...newBus, capacity: Number(newBus.capacity) });
      setNewBus({ regNumber: "", driverName: "", capacity: 40, route: routes[0]?._id || "" });
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteBus(id) {
    if (!confirm("Delete this bus?")) return;
    try {
      await deleteBus(id);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleStatus(bus) {
    const next = bus.status === "offline" ? "active" : "offline";
    try {
      await updateBus(bus._id, { status: next });
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteRoute(id) {
    if (!confirm("Delete this route? Buses assigned to it will be orphaned.")) return;
    try {
      await deleteRoute(id);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-page">
      <h2>Admin Dashboard</h2>
      {error && <div className="app-error">⚠ {error}</div>}

      {overview && (
        <div className="admin-stats">
          <div className="admin-stat-card"><strong>{overview.totalRoutes}</strong><span>Routes</span></div>
          <div className="admin-stat-card"><strong>{overview.totalBuses}</strong><span>Total buses</span></div>
          <div className="admin-stat-card"><strong>{overview.activeBuses}</strong><span>Active</span></div>
          <div className="admin-stat-card"><strong>{overview.idleBuses}</strong><span>Idle</span></div>
          <div className="admin-stat-card"><strong>{overview.offlineBuses}</strong><span>Offline</span></div>
          <div className="admin-stat-card"><strong>{overview.notificationsLast24h}</strong><span>Alerts (24h)</span></div>
        </div>
      )}

      <section className="admin-section">
        <h3>Routes</h3>
        <table className="admin-table">
          <thead>
            <tr><th>Code</th><th>Name</th><th>Start</th><th>End</th><th>Stops</th><th></th></tr>
          </thead>
          <tbody>
            {routes.map((r) => (
              <tr key={r._id}>
                <td>{r.routeCode}</td>
                <td>{r.routeName}</td>
                <td>{r.startPoint}</td>
                <td>{r.endPoint}</td>
                <td>{r.stops?.length ?? "-"}</td>
                <td><button onClick={() => handleDeleteRoute(r._id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="admin-hint">
          Creating routes with a full stop/path list is easiest via the API (POST /api/routes) or
          by extending this form — kept minimal here since a route needs several stop + path fields.
        </p>
      </section>

      <section className="admin-section">
        <h3>Buses</h3>
        <table className="admin-table">
          <thead>
            <tr><th>Reg No.</th><th>Driver</th><th>Route</th><th>Status</th><th>Speed</th><th></th></tr>
          </thead>
          <tbody>
            {buses.map((b) => (
              <tr key={b._id}>
                <td>{b.regNumber}</td>
                <td>{b.driverName}</td>
                <td>{b.route?.routeName || "-"}</td>
                <td>{b.status}</td>
                <td>{b.speedKmph} km/h</td>
                <td>
                  <button onClick={() => handleToggleStatus(b)}>
                    {b.status === "offline" ? "Activate" : "Take offline"}
                  </button>
                  <button onClick={() => handleDeleteBus(b._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form className="admin-inline-form" onSubmit={handleCreateBus}>
          <h4>Add bus</h4>
          <input
            placeholder="Reg number"
            value={newBus.regNumber}
            onChange={(e) => setNewBus({ ...newBus, regNumber: e.target.value })}
            required
          />
          <input
            placeholder="Driver name"
            value={newBus.driverName}
            onChange={(e) => setNewBus({ ...newBus, driverName: e.target.value })}
          />
          <input
            type="number"
            placeholder="Capacity"
            value={newBus.capacity}
            onChange={(e) => setNewBus({ ...newBus, capacity: e.target.value })}
          />
          <select
            value={newBus.route}
            onChange={(e) => setNewBus({ ...newBus, route: e.target.value })}
            required
          >
            <option value="">Select route</option>
            {routes.map((r) => (
              <option key={r._id} value={r._id}>{r.routeCode} — {r.routeName}</option>
            ))}
          </select>
          <button type="submit">Add bus</button>
        </form>
      </section>
    </div>
  );
}
