const express = require("express");
const Bus = require("../models/Bus");
const Route = require("../models/Route");
const { estimateStopETAs } = require("../utils/eta");
const { verifyToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/buses - public: all buses with live location + route summary
router.get("/", async (req, res) => {
  try {
    const buses = await Bus.find().populate("route", "routeName routeCode startPoint endPoint");
    res.json(buses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/buses/:id - public
router.get("/:id", async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id).populate("route");
    if (!bus) return res.status(404).json({ error: "Bus not found" });
    res.json(bus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/buses/:id/eta - public: ETA to each upcoming stop for this bus
router.get("/:id/eta", async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) return res.status(404).json({ error: "Bus not found" });

    const route = await Route.findById(bus.route);
    if (!route) return res.status(404).json({ error: "Route not found for this bus" });

    const upcoming = estimateStopETAs(bus, route);
    res.json({ busId: bus._id, regNumber: bus.regNumber, upcoming });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/buses/route/:routeId - public
router.get("/route/:routeId", async (req, res) => {
  try {
    const buses = await Bus.find({ route: req.params.routeId });
    res.json(buses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/buses - admin only
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const bus = await Bus.create(req.body);
    res.status(201).json(bus);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/buses/:id - admin only (edit driver, capacity, reassign route, etc.)
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const bus = await Bus.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!bus) return res.status(404).json({ error: "Bus not found" });
    res.json(bus);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/buses/:id - admin only
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const bus = await Bus.findByIdAndDelete(req.params.id);
    if (!bus) return res.status(404).json({ error: "Bus not found" });
    res.json({ message: "Bus deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/buses/:id/location - lets a real device (or Postman) push a location update.
// Public by design (a real device wouldn't have a user JWT) — in production you'd
// authenticate this with a per-device API key instead.
router.patch("/:id/location", async (req, res) => {
  try {
    const { lat, lng, speedKmph } = req.body;
    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      {
        currentLocation: { lat, lng },
        speedKmph: speedKmph ?? 0,
        status: "active",
        lastUpdated: new Date(),
      },
      { new: true }
    );
    if (!bus) return res.status(404).json({ error: "Bus not found" });

    req.app.get("io").emit("busLocationUpdate", {
      busId: bus._id,
      lat: bus.currentLocation.lat,
      lng: bus.currentLocation.lng,
      speedKmph: bus.speedKmph,
      routeId: bus.route,
    });

    res.json(bus);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
