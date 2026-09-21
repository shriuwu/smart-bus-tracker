/**
 * GPS Simulator
 * ---------------
 * Stands in for real GPS hardware. Moves every non-offline bus a small
 * distance along its route's `path` (at a realistic speed) on a fixed interval, updates MongoDB, and
 * emits the new position over Socket.IO ("simulatorUpdate"). The server is
 * responsible for relaying it to browsers and running ETA/notification logic
 * — the simulator itself only ever reports a raw position, just like a real
 * GPS device would.
 *
 * Run with:  npm run simulate   (from the backend folder, after `npm run seed`)
 * On a hosted deployment it is started by server.js instead (set RUN_SIMULATOR=true).
 */
require("dotenv").config();
const { io: ioClient } = require("socket.io-client");

const connectDB = require("../config/db");
const Bus = require("../models/Bus");
const Route = require("../models/Route");

const TICK_MS = 2000;
// Average bus speed in km/h. Each tick the reported speed varies +/-20% around this.
// Change it here or set SIM_SPEED_KMPH in backend/.env (higher = faster demo).
const TARGET_SPEED_KMPH = Number(process.env.SIM_SPEED_KMPH) || 30;
const SERVER_URL = `http://localhost:${process.env.PORT || 5000}`;

function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// <advance>
// Moves a bus `stepKm` along its route path, passing through waypoints if needed.
// `along` = km already travelled on the current segment (pathIndex -> next waypoint).
// Returns the new position and the updated `along`. Mutates bus.pathIndex / bus.direction.
function advance(bus, path, along, stepKm) {
  let remaining = stepKm;
  for (let guard = 0; guard < 1000; guard++) {
    let ni = bus.pathIndex + bus.direction;
    if (ni >= path.length || ni < 0) {
      bus.direction *= -1; // reached an end of the route: turn around
      ni = bus.pathIndex + bus.direction;
    }
    const from = path[bus.pathIndex];
    const to = path[ni];
    const segKm = distanceKm(from, to);
    const left = segKm - along;

    if (remaining >= left) {
      remaining -= left;
      bus.pathIndex = ni;
      along = 0;
      if (remaining <= 0) return { position: { lat: to.lat, lng: to.lng }, along };
    } else {
      along += remaining;
      const t = segKm > 0 ? along / segKm : 0;
      return {
        position: { lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t },
        along,
      };
    }
  }
  const p = path[bus.pathIndex];
  return { position: { lat: p.lat, lng: p.lng }, along: 0 };
}
// </advance>

async function tick(socket, routeCache, progressCache) {
  const buses = await Bus.find({ status: { $ne: "offline" } });

  for (const bus of buses) {
    let route = routeCache.get(String(bus.route));
    if (!route) {
      route = await Route.findById(bus.route);
      if (!route || !route.path || route.path.length < 2) continue;
      routeCache.set(String(bus.route), route);
    }

    const speedKmph = Math.round(TARGET_SPEED_KMPH * (0.8 + Math.random() * 0.4) * 10) / 10;
    const stepKm = speedKmph * (TICK_MS / 3600000); // distance covered this tick

    const { position, along } = advance(bus, route.path, progressCache.get(String(bus._id)) || 0, stepKm);
    progressCache.set(String(bus._id), along);

    bus.currentLocation = { lat: position.lat, lng: position.lng };
    bus.speedKmph = speedKmph;
    bus.status = "active";
    bus.lastUpdated = new Date();
    await bus.save();

    socket.emit("simulatorUpdate", {
      busId: bus._id,
      routeId: bus.route,
      lat: position.lat,
      lng: position.lng,
      speedKmph,
      timestamp: bus.lastUpdated,
    });

    console.log(`Bus ${bus.regNumber} -> (${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}) @ ${speedKmph} km/h`);
  }
}

async function run({ connect = true } = {}) {
  if (connect) await connectDB(); // when started from server.js the DB is already connected
  const socket = ioClient(SERVER_URL, { reconnection: true });

  socket.on("connect", () => console.log("Simulator connected to server socket:", socket.id));
  socket.on("connect_error", (err) =>
    console.error("Simulator could not reach the server — is `npm run dev` running in another terminal?", err.message)
  );

  const routeCache = new Map();
  const progressCache = new Map(); // busId -> km travelled along the current segment
  console.log(`Starting GPS simulation loop (every ${TICK_MS / 1000}s). Ctrl+C to stop.`);
  setInterval(() => {
    tick(socket, routeCache, progressCache).catch((err) => console.error("Simulator tick error:", err.message));
  }, TICK_MS);
}

// Started from server.js (RUN_SIMULATOR=true): the server has already connected to MongoDB.
module.exports = { startSimulator: () => run({ connect: false }) };

// Started with `npm run simulate`: connect to MongoDB and run on its own.
if (require.main === module) run();
