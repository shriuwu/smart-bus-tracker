const express = require("express");
const Bus = require("../models/Bus");
const Route = require("../models/Route");
const Notification = require("../models/Notification");
const { verifyToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// All routes here require a logged-in admin.
router.use(verifyToken, requireAdmin);

// GET /api/admin/overview - fleet + route stats for the dashboard
router.get("/overview", async (req, res) => {
  try {
    const [totalRoutes, totalBuses, activeBuses, idleBuses, offlineBuses, recentNotifications] =
      await Promise.all([
        Route.countDocuments(),
        Bus.countDocuments(),
        Bus.countDocuments({ status: "active" }),
        Bus.countDocuments({ status: "idle" }),
        Bus.countDocuments({ status: "offline" }),
        Notification.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
      ]);

    res.json({
      totalRoutes,
      totalBuses,
      activeBuses,
      idleBuses,
      offlineBuses,
      notificationsLast24h: recentNotifications,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
