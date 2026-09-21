/**
 * Seeds the database with:
 *  - 1 sample route (with stops + a road path)
 *  - 2 buses running on it
 *  - 1 admin user + 1 regular user (for testing login/admin dashboard)
 *
 * Run with: npm run seed
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const Route = require("../models/Route");
const Bus = require("../models/Bus");
const User = require("../models/User");
const Notification = require("../models/Notification");

const samplePath = [
  { lat: 22.5726, lng: 88.3639 }, // Esplanade
  { lat: 22.5690, lng: 88.3730 },
  { lat: 22.5645, lng: 88.3800 },
  { lat: 22.5600, lng: 88.3880 },
  { lat: 22.5550, lng: 88.3950 },
  { lat: 22.5500, lng: 88.4020 },
  { lat: 22.5460, lng: 88.4090 }, // Park Circus
];

const sampleStops = [
  { name: "Esplanade", lat: 22.5726, lng: 88.3639, sequence: 1 },
  { name: "Sealdah", lat: 22.5645, lng: 88.3800, sequence: 2 },
  { name: "Park Circus", lat: 22.5460, lng: 88.4090, sequence: 3 },
];

async function seed() {
  await connectDB();

  await Route.deleteMany({});
  await Bus.deleteMany({});
  await User.deleteMany({});
  await Notification.deleteMany({});

  const route = await Route.create({
    routeName: "Esplanade - Park Circus",
    routeCode: "12",
    startPoint: "Esplanade",
    endPoint: "Park Circus",
    stops: sampleStops,
    path: samplePath,
  });

  await Bus.create([
    {
      regNumber: "WB-06-1234",
      driverName: "R. Sharma",
      capacity: 40,
      route: route._id,
      currentLocation: samplePath[0],
      pathIndex: 0,
      direction: 1,
      status: "active",
    },
    {
      regNumber: "WB-06-5678",
      driverName: "A. Khan",
      capacity: 40,
      route: route._id,
      currentLocation: samplePath[3],
      pathIndex: 3,
      direction: -1,
      status: "active",
    },
  ]);

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const userPasswordHash = await bcrypt.hash("user123", 10);

  await User.create([
    { name: "Admin", email: "admin@example.com", passwordHash: adminPasswordHash, role: "admin" },
    { name: "Test Commuter", email: "user@example.com", passwordHash: userPasswordHash, role: "user" },
  ]);

  console.log("Seed complete: 1 route, 2 buses, 2 users created.");
  console.log("  Admin login:  admin@example.com / admin123");
  console.log("  User login:   user@example.com / user123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
