const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function authHeaders() {
  const token = localStorage.getItem("sbt_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ---------- public reads ----------
export const fetchRoutes = () => fetch(`${API_URL}/api/routes`).then(handle);
export const fetchRouteDetail = (routeId) => fetch(`${API_URL}/api/routes/${routeId}`).then(handle);
export const fetchBuses = () => fetch(`${API_URL}/api/buses`).then(handle);
export const fetchBusEta = (busId) => fetch(`${API_URL}/api/buses/${busId}/eta`).then(handle);
export const fetchNotifications = (limit = 20) =>
  fetch(`${API_URL}/api/notifications?limit=${limit}`).then(handle);

// ---------- auth ----------
export const registerUser = (payload) =>
  fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(handle);

export const loginUser = (payload) =>
  fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(handle);

export const fetchMe = () =>
  fetch(`${API_URL}/api/auth/me`, { headers: { ...authHeaders() } }).then(handle);

// ---------- admin: overview ----------
export const fetchAdminOverview = () =>
  fetch(`${API_URL}/api/admin/overview`, { headers: { ...authHeaders() } }).then(handle);

// ---------- admin: routes CRUD ----------
export const createRoute = (payload) =>
  fetch(`${API_URL}/api/routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  }).then(handle);

export const deleteRoute = (routeId) =>
  fetch(`${API_URL}/api/routes/${routeId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  }).then(handle);

// ---------- admin: buses CRUD ----------
export const createBus = (payload) =>
  fetch(`${API_URL}/api/buses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  }).then(handle);

export const updateBus = (busId, payload) =>
  fetch(`${API_URL}/api/buses/${busId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  }).then(handle);

export const deleteBus = (busId) =>
  fetch(`${API_URL}/api/buses/${busId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  }).then(handle);
