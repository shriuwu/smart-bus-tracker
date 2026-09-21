import { useEffect, useState, useCallback } from "react";
import { socket } from "../socket";
import { fetchNotifications } from "../api";

const MAX_VISIBLE = 3; // never show more than this many alerts at once
const DISMISS_MS = 8000; // each alert disappears by itself after 8 seconds
const HISTORY_WINDOW_MS = 30000; // on page load, only show alerts from the last 30s

// Shows "bus arriving soon" alerts floating over the map.
// Live alerts arrive over the socket; each one auto-dismisses.
export default function NotificationsFeed() {
  const [alerts, setAlerts] = useState([]);

  const dismiss = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const push = useCallback(
    (alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, MAX_VISIBLE));
      setTimeout(() => dismiss(alert.id), DISMISS_MS);
    },
    [dismiss]
  );

  useEffect(() => {
    fetchNotifications(5)
      .then((history) => {
        history
          .filter((n) => Date.now() - new Date(n.createdAt).getTime() < HISTORY_WINDOW_MS)
          .reverse()
          .forEach((n) => push({ id: n._id, message: n.message, createdAt: n.createdAt }));
      })
      .catch(() => {});
  }, [push]);

  useEffect(() => {
    function handleAlert(data) {
      push({
        id: `${data.busId}-${data.stopName}-${Date.now()}`,
        message: data.message,
        createdAt: data.createdAt,
      });
    }
    socket.on("stopAlert", handleAlert);
    return () => socket.off("stopAlert", handleAlert);
  }, [push]);

  if (alerts.length === 0) return null;

  return (
    <div className="notifications-feed">
      {alerts.map((a) => (
        <div key={a.id} className="notification-toast">
          🔔 {a.message}
        </div>
      ))}
    </div>
  );
}
