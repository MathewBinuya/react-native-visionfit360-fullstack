import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useAuthStore } from "../store/authStore";
import { syncPending } from "./offlineWorkouts";

// Mount once inside the authenticated area. Flushes any pending offline workout
// completions when the app starts and whenever it returns to the foreground —
// the two "connectivity returned" moments we can observe without NetInfo. The
// Workout Tracker also calls syncPending() itself when it opens while online.
// syncPending() coalesces concurrent calls, so overlapping triggers are safe.
export function useWorkoutSync() {
  const user = useAuthStore((s) => s.user);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!user) return;
    syncPending(user);

    const sub = AppState.addEventListener("change", (next) => {
      if (/inactive|background/.test(appState.current) && next === "active") {
        syncPending(user);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [user]);
}
