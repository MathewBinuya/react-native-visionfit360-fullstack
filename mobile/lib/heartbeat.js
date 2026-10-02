import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import api from "./axios";

// How often the app refreshes its presence while in the foreground.
// Keep this comfortably under the backend "Active" window (2 min) so an
// in-app user stays "Active". Tunable.
export const HEARTBEAT_INTERVAL_MS = 45 * 1000;

// Best-effort presence ping. Never throws — presence is non-critical and must
// never interrupt the user. (A 401 is still handled by the axios interceptor.)
export const sendHeartbeat = async () => {
  try {
    await api.post("/profile/heartbeat");
  } catch (e) {
    // ignore
  }
};

// Mount once inside the authenticated area. Pings on mount, on a throttled
// interval, and whenever the app returns to the foreground.
export function useHeartbeat() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    const sub = AppState.addEventListener("change", (next) => {
      if (/inactive|background/.test(appState.current) && next === "active") {
        sendHeartbeat();
      }
      appState.current = next;
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);
}
