require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const routeRoutes = require("./routes/routeRoutes");
const busRoutes = require("./routes/busRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const Bus = require("./models/Bus");
const Route = require("./models/Route");
const { checkAndNotify } = require("./services/notifier");

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

async function start() {
  await connectDB();

  const app = express();
  app.use(cors({ origin: CLIENT_ORIGIN }));
  app.use(express.json());

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
  });

  app.set("io", io);

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // The GPS simulator (or a real device gateway) connects as a client too and
    // emits "simulatorUpdate" here. The server relays the raw position to every
    // browser as "busLocationUpdate", and separately runs the ETA/notification
    // logic so the simulator itself can stay a "dumb" GPS source.
    socket.on("simulatorUpdate", async (data) => {
      io.emit("busLocationUpdate", data);

      try {
        const [bus, route] = await Promise.all([
          Bus.findById(data.busId),
          Route.findById(data.routeId),
        ]);
        if (bus && route) await checkAndNotify(io, bus, route);
      } catch (err) {
        console.error("Notifier error:", err.message);
      }
    });

    socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
  });

  app.get("/", (req, res) => res.json({ status: "Smart Bus Tracker API is running" }));
  app.use("/api/auth", authRoutes);
  app.use("/api/routes", routeRoutes);
  app.use("/api/buses", busRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/notifications", notificationRoutes);

  server.listen(PORT, () => {
    console.log(`Server + Socket.IO listening on http://localhost:${PORT}`);

    // On a hosted deployment there is no second terminal for `npm run simulate`,
    // so setting RUN_SIMULATOR=true runs the GPS simulator inside this process.
    // Locally, leave it unset and keep using `npm run simulate` in its own terminal.
    if (process.env.RUN_SIMULATOR === "true") {
      require("./simulator/gpsSimulator").startSimulator();
    }
  });
}

start();
