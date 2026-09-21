const express = require("express");
const Notification = require("../models/Notification");

const router = express.Router();

// GET /api/notifications - recent alerts, newest first (public feed; commuters can see it too)
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("bus", "regNumber")
      .populate("route", "routeName routeCode");
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
