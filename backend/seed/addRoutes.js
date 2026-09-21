/**
 * Adds extra sample routes + buses WITHOUT touching anything that already exists
 * (unlike `npm run seed`, this never deletes data). Safe to run more than once:
 * a route or bus that already exists is skipped.
 *
 * Run with:  node seed/addRoutes.js     (from the backend folder)
 *
 * To add your own route, copy one of the blocks below and change the names and
 * coordinates. The route line on the map goes straight from stop to stop, in
 * the order you list them. Coordinates are approximate.
 */
require("dotenv").config();
const connectDB = require("../config/db");
const Route = require("../models/Route");
const Bus = require("../models/Bus");

// <routes>
const NEW_ROUTES = [
  {
    routeCode: "45",
    routeName: "Howrah Station - Jadavpur",
    stops: [
      { name: "Howrah Station", lat: 22.5839, lng: 88.3428 },
      { name: "Esplanade", lat: 22.5726, lng: 88.3639 },
      { name: "Park Street", lat: 22.5535, lng: 88.3520 },
      { name: "Gariahat", lat: 22.5187, lng: 88.3665 },
      { name: "Jadavpur", lat: 22.4965, lng: 88.3710 },
    ],
    buses: [
      { regNumber: "WB-06-2001", driverName: "S. Das" },
      { regNumber: "WB-06-2002", driverName: "M. Ali" },
    ],
  },
  {
    routeCode: "S10",
    routeName: "Esplanade - Salt Lake Sector V",
    stops: [
      { name: "Esplanade", lat: 22.5726, lng: 88.3639 },
      { name: "Sealdah", lat: 22.5677, lng: 88.3700 },
      { name: "Ultadanga", lat: 22.5942, lng: 88.3931 },
      { name: "Karunamoyee", lat: 22.5860, lng: 88.4140 },
      { name: "Sector V", lat: 22.5735, lng: 88.4331 },
    ],
    buses: [
      { regNumber: "WB-06-3001", driverName: "P. Roy" },
      { regNumber: "WB-06-3002", driverName: "T. Sen" },
    ],
  },
  {
    routeCode: "V1",
    routeName: "Shyambazar - Airport",
    stops: [
      { name: "Shyambazar", lat: 22.6010, lng: 88.3735 },
      { name: "Dum Dum", lat: 22.6234, lng: 88.3931 },
      { name: "Airport", lat: 22.6547, lng: 88.4467 },
    ],
    buses: [
      { regNumber: "WB-06-4001", driverName: "K. Ghosh" },
      { regNumber: "WB-06-4002", driverName: "N. Paul" },
    ],
  },
];
// </routes>

async function addRoutes() {
  await connectDB();

  for (const def of NEW_ROUTES) {
    let route = await Route.findOne({ routeCode: def.routeCode });
    if (route) {
      console.log(`Route ${def.routeCode} already exists - skipped`);
    } else {
      const stops = def.stops.map((s, i) => ({ ...s, sequence: i + 1 }));
      route = await Route.create({
        routeName: def.routeName,
        routeCode: def.routeCode,
        startPoint: stops[0].name,
        endPoint: stops[stops.length - 1].name,
        stops,
        // the bus path goes through every stop, in order
        path: stops.map((s) => ({ lat: s.lat, lng: s.lng })),
      });
      console.log(`Route ${def.routeCode} (${def.routeName}) created`);
    }

    const path = route.path;
    for (let i = 0; i < def.buses.length; i++) {
      const b = def.buses[i];
      if (await Bus.findOne({ regNumber: b.regNumber })) {
        console.log(`  Bus ${b.regNumber} already exists - skipped`);
        continue;
      }
      // first bus starts at the beginning going forward, second starts at the far end coming back
      const atEnd = i % 2 === 1;
      const startIndex = atEnd ? path.length - 1 : 0;
      await Bus.create({
        regNumber: b.regNumber,
        driverName: b.driverName,
        capacity: 40,
        route: route._id,
        currentLocation: { lat: path[startIndex].lat, lng: path[startIndex].lng },
        pathIndex: startIndex,
        direction: atEnd ? -1 : 1,
        status: "active",
      });
      console.log(`  Bus ${b.regNumber} created`);
    }
  }

  console.log("Done.");
  process.exit(0);
}

addRoutes().catch((err) => {
  console.error("addRoutes failed:", err);
  process.exit(1);
});
