const mongoose = require("mongoose");

const StopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    sequence: { type: Number, required: true },
  },
  { _id: false }
);

const WaypointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const RouteSchema = new mongoose.Schema(
  {
    routeName: { type: String, required: true },
    routeCode: { type: String, required: true, unique: true },
    startPoint: { type: String, required: true },
    endPoint: { type: String, required: true },
    stops: [StopSchema],
    path: [WaypointSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Route", RouteSchema);
