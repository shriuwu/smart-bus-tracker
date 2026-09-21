# Smart Bus Tracker

A real-time GPS-based public bus tracking system — built for the SWE Lab project.

**Stack:** Node.js + Express + MongoDB (backend), Socket.IO (real-time), JWT auth,
React + Vite + Leaflet + React Router (frontend).

## Modules included

| Module | Where |
|---|---|
| Real-time GPS tracking | `backend/simulator/gpsSimulator.js` + `busLocationUpdate` socket event |
| ETA engine | `backend/utils/eta.js`, exposed via `GET /api/buses/:id/eta` |
| Notifications ("bus arriving soon") | `backend/services/notifier.js` + `stopAlert` socket event + `Notification` model |
| User accounts (JWT login/register) | `backend/routes/authRoutes.js`, `backend/models/User.js` |
| Admin dashboard (fleet stats + CRUD) | `backend/routes/adminRoutes.js`, `frontend/src/pages/AdminDashboard.jsx` |

## How it works end-to-end

1. **GPS Simulator** moves each bus along its route's path every ~3s, saves the new
   location to MongoDB, and emits it over a socket (`simulatorUpdate`) — acting like a
   real GPS device would.
2. **Server** relays that position to every browser (`busLocationUpdate`), then runs the
   **notifier**: it recomputes ETA to the next stop and, if the bus is close enough and
   hasn't already been flagged for that stop, saves a `Notification` and broadcasts
   `stopAlert` to everyone.
3. **Frontend** shows live bus positions on a Leaflet map, ETA on hover (via
   `GET /api/buses/:id/eta`), and a small live toast feed of `stopAlert` events.
4. **Auth**: `POST /api/auth/register` and `/login` return a JWT, stored in
   `localStorage` and sent as `Authorization: Bearer <token>` on admin requests.
5. **Admin dashboard** (`/admin`, admin-role only) shows fleet stats and lets an admin
   add/remove buses, toggle a bus online/offline, and delete routes.

## Prerequisites

- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas connection string)

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # edit MONGO_URI and JWT_SECRET
npm run seed                # creates 1 route, 2 buses, 1 admin + 1 regular user
npm run dev                 # starts the API + Socket.IO server on :5000
```

Seeded logins (from `npm run seed`):
- Admin: `admin@example.com` / `admin123`
- User:  `user@example.com` / `user123`

### 2. GPS simulator (second terminal)

```bash
cd backend
npm run simulate
```

### 3. Frontend (third terminal)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

Open the frontend, watch buses move live, hover a bus marker for its ETA to upcoming
stops, and log in as the seeded admin to visit `/admin`.

## API reference (quick)

**Public**
- `GET /api/routes`, `GET /api/routes/:id`
- `GET /api/buses`, `GET /api/buses/:id`, `GET /api/buses/:id/eta`, `GET /api/buses/route/:routeId`
- `PATCH /api/buses/:id/location` — for a real device or Postman to push a location
- `GET /api/notifications?limit=20`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` (auth required)

**Admin only** (send `Authorization: Bearer <token>` for an admin user)
- `POST/PUT/DELETE /api/routes/:id`
- `POST/PUT/DELETE /api/buses/:id`
- `GET /api/admin/overview`

## Project structure

```
smart-bus-tracker/
  backend/
    config/db.js
    models/{Bus,Route,User,Notification}.js
    middleware/auth.js              # JWT verify + admin-role guard
    utils/eta.js                    # straight-line ETA estimator
    services/notifier.js            # "bus arriving soon" alert logic
    routes/{authRoutes,busRoutes,routeRoutes,adminRoutes,notificationRoutes}.js
    simulator/gpsSimulator.js
    seed/seed.js
    server.js
  frontend/
    src/
      api.js                        # all REST calls (incl. auth headers)
      socket.js
      context/AuthContext.jsx       # login/register/logout state
      components/{MapView,NavBar,ProtectedRoute,NotificationsFeed}.jsx
      pages/{MapPage,LoginPage,RegisterPage,AdminDashboard}.jsx
      App.jsx                       # React Router setup
```

## Known limitations / next steps

- ETA is straight-line-distance based (no real road-graph routing) — fine for a lab
  project, but swap in a routing engine (OSRM, Mapbox Directions) for production accuracy.
- The `PATCH /api/buses/:id/location` endpoint is intentionally unauthenticated (a real
  device wouldn't hold a user JWT) — for production, protect it with a per-device API key.
- Admin dashboard's "add route" is left minimal (routes need a full stop/path list) —
  either extend the form or use `POST /api/routes` directly.
