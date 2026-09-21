/**
 * Notification service
 * ---------------------
 * Called every time a bus's live location changes (see server.js's
 * "simulatorUpdate" handler). If the bus is within ARRIVAL_THRESHOLD_KM of
 * its next stop and we haven't already alerted for that stop, it:
 *   1. Saves a Notification document (so the admin dashboard / late-joining
 *      clients can see a history of alerts), and
 *   2. Emits "stopAlert" to every connected client over Socket.IO.
 */
const Notification = require("../models/Notification");
const { estimateStopETAs } = require("../utils/eta");

const ARRIVAL_THRESHOLD_KM = 0.3; // ~300m — tune for your city's stop spacing

async function checkAndNotify(io, bus, route) {
  const upcoming = estimateStopETAs(bus, route);
  if (upcoming.length === 0) return;

  const nextStop = upcoming[0];
  if (nextStop.distanceKm > ARRIVAL_THRESHOLD_KM) {
    // bus moved away from the stop it was near — clear the dedupe flag
    if (bus.lastNotifiedStop) {
      bus.lastNotifiedStop = null;
      await bus.save();
    }
    return;
  }

  // already notified for this exact stop — don't spam every tick
  if (bus.lastNotifiedStop === nextStop.stopName) return;

  const message = `${bus.regNumber} is arriving at ${nextStop.stopName} in about ${nextStop.etaMinutes} min`;

  await Notification.create({
    bus: bus._id,
    route: route._id,
    stopName: nextStop.stopName,
    message,
    etaMinutes: nextStop.etaMinutes,
  });

  bus.lastNotifiedStop = nextStop.stopName;
  await bus.save();

  io.emit("stopAlert", {
    busId: bus._id,
    regNumber: bus.regNumber,
    routeId: route._id,
    routeName: route.routeName,
    stopName: nextStop.stopName,
    etaMinutes: nextStop.etaMinutes,
    message,
    createdAt: new Date(),
  });

  console.log("Notification sent:", message);
}

module.exports = { checkAndNotify, ARRIVAL_THRESHOLD_KM };
