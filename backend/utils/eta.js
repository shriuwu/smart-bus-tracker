/**
 * ETA Engine
 * ----------
 * A lightweight, explainable ETA estimate — appropriate for a lab project
 * (no real road-graph routing). For each stop the bus has not yet reached
 * (in the direction it is travelling), it measures the distance along the
 * route path from the bus's current position and divides by a speed estimate
 * (the bus's current speed, or a sane fallback when idle).
 *
 * Works for buses travelling in either direction along the route.
 */

const FALLBACK_SPEED_KMPH = 20; // used when the bus is stationary/just started

function haversineKm(a, b) {
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

// index of the path waypoint closest to a stop
function nearestWaypointIndex(stop, path) {
  let best = 0;
  let bestDist = Infinity;
  path.forEach((p, i) => {
    const d = haversineKm(stop, p);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

/**
 * @param {object} bus - Mongoose Bus document (needs currentLocation, speedKmph, pathIndex, direction)
 * @param {object} route - Mongoose Route document (needs stops[], path[])
 * @returns {Array<{stopName, sequence, distanceKm, etaMinutes}>} upcoming stops, nearest first
 */
function estimateStopETAs(bus, route) {
  if (!bus.currentLocation || bus.currentLocation.lat == null) return [];
  if (!route.stops || route.stops.length === 0) return [];
  if (!route.path || route.path.length < 2) return [];

  const path = route.path;
  const speed = bus.speedKmph > 2 ? bus.speedKmph : FALLBACK_SPEED_KMPH;

  // pathIndex = last waypoint the bus reached; it is now heading to the next one
  let dir = bus.direction === -1 ? -1 : 1;
  let nextIdx = bus.pathIndex + dir;
  if (nextIdx < 0 || nextIdx >= path.length) {
    // bus is at an end of the route and about to turn around
    dir = -dir;
    nextIdx = bus.pathIndex + dir;
  }

  const toNextWaypointKm = haversineKm(bus.currentLocation, path[nextIdx]);

  return route.stops
    .map((stop) => ({ stop, idx: nearestWaypointIndex(stop, path) }))
    .filter(({ idx }) => (idx - bus.pathIndex) * dir > 0) // only stops still ahead
    .map(({ stop, idx }) => {
      // distance along the path: bus -> next waypoint -> ... -> the stop
      let distanceKm = toNextWaypointKm;
      for (let i = nextIdx; i !== idx; i += dir) {
        distanceKm += haversineKm(path[i], path[i + dir]);
      }
      const etaMinutes = Math.max(1, Math.round((distanceKm / speed) * 60));
      return {
        stopName: stop.name,
        sequence: stop.sequence,
        distanceKm: Math.round(distanceKm * 100) / 100,
        etaMinutes,
        _sortKm: distanceKm,
      };
    })
    .sort((a, b) => a._sortKm - b._sortKm)
    .map(({ _sortKm, ...rest }) => rest);
}

module.exports = { estimateStopETAs, haversineKm };
