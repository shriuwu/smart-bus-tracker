const mongoose = require("mongoose");

const BusSchema = new mongoose.Schema(
  {
    regNumber: { type: String, required: true, unique: true },
    driverName: { type: String, default: "Unassigned" },
    capacity: { type: Number, default: 40 },
    route: { type: mongoose.Schema.Types.ObjectId, ref: "Route", required: true },

    currentLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    speedKmph: { type: Number, default: 0 },
    pathIndex: { type: Number, default: 0 },
    direction: { type: Number, default: 1 },
    status: { type: String, enum: ["active", "idle", "offline"], default: "idle" },
    lastUpdated: { type: Date, default: Date.now },

    // dedupe key so the notifier doesn't spam the same "arriving" alert every tick
    lastNotifiedStop: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bus", BusSchema);
