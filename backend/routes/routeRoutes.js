const express = require("express");
const Route = require("../models/Route");
const { verifyToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/routes - public: list all routes (without full path, lighter payload)
router.get("/", async (req, res) => {
  try {
    const routes = await Route.find().select("-path");
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/routes/:id - public: full route detail including path (for the polyline)
router.get("/:id", async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) return res.status(404).json({ error: "Route not found" });
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/routes - admin only
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const route = await Route.create(req.body);
    res.status(201).json(route);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/routes/:id - admin only
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const route = await Route.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!route) return res.status(404).json({ error: "Route not found" });
    res.json(route);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/routes/:id - admin only
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);
    if (!route) return res.status(404).json({ error: "Route not found" });
    res.json({ message: "Route deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
