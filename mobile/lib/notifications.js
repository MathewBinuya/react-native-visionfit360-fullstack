import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./axios";
import { setPlanned, logNotification } from "./notifInbox";

// updated handler (new API: shouldShowBanner / shouldShowList instead of shouldShowAlert)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const QUOTES = [
  "Push yourself, because no one else will do it for you.",
  "The body achieves what the mind believes.",
  "Sweat now, shine later.",
  "Don't wish for it, work for it.",
  "Your only limit is you.",
  "Strong is the new strong.",
  "Wake up. Work out. Look hot. Kick ass.",
  "A one-hour workout is 4% of your day. No excuses.",
  "Success starts with self-discipline.",
  "The pain you feel today is the strength you feel tomorrow.",
  "Train insane or remain the same.",
  "Fall in love with taking care of yourself.",
  "Discipline is choosing what you want most over what you want now.",
  "Little by little, a little becomes a lot.",
  "You don't have to be extreme, just consistent.",
  "Doubt me. Hate me. You're the inspiration I need.",
  "Energy and persistence conquer all things.",
  "The hardest lift of all is lifting your butt off the couch.",
  "Be stronger than your excuses.",
  "Results happen over time, not overnight.",
];

const randomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

export const NOTIF_SETTINGS_KEY = "notifSettings";

// Reminders fire at 8:00 AM and 8:00 PM Asia/Manila. Manila is UTC+8 with no
// DST, so each slot is an absolute instant — scheduled as one-shot DATE
// triggers it fires at Manila time whatever timezone the device is set to.
export const TIMEZONE = "Asia/Manila";
export const MORNING = { hour: 8, minute: 0 };
export const EVENING = { hour: 20, minute: 0 };
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
// Each refresh (app open, workout completed) re-plans this window, so content
// stays current while the user is active; an inactive user gets reminders for this long.
const SCHEDULE_DAYS = 10;

const manilaDay = (ms) => Math.floor((ms + MANILA_OFFSET_MS) / DAY_MS);
const manilaWeekStart = (day) => day - ((new Date(day * DAY_MS).getUTCDay() + 6) % 7);

const upcomingSlots = (nowMs = Date.now()) => {
  const today = manilaDay(nowMs);
  const slots = [];
  for (let d = 0; d <= SCHEDULE_DAYS; d++) {
    for (const [kind, t] of [["morning", MORNING], ["evening", EVENING]]) {
      const at = (today + d) * DAY_MS - MANILA_OFFSET_MS + (t.hour * 60 + t.minute) * 60 * 1000;
      if (at > nowMs + 60 * 1000) slots.push({ kind, at, day: today + d });
    }
  }
  return slots.slice(0, SCHEDULE_DAYS * 2);
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Project the user's numbers to the moment a slot fires, assuming nothing new
// is logged before then (a new workout triggers a refresh anyway).
const projectAt = (slot, analytics, nowMs) => {
  const s = analytics.summary;
  const today = manilaDay(nowMs);
  const sameWeek = manilaWeekStart(slot.day) === manilaWeekStart(today);
  return {
    total: s.totalWorkouts,
    target: s.weeklyTarget || 3,
    pending: s.pendingWorkouts || 0,
    weekWorkouts: sameWeek ? s.thisWeek.workouts : 0,
    weekVolume: sameWeek ? s.thisWeek.volume : 0,
    prevVolume: sameWeek ? s.lastWeek.volume : s.thisWeek.volume,
    newWeek: !sameWeek && slot.day === manilaWeekStart(slot.day),
    daysSince: s.daysSinceLastWorkout == null ? null : s.daysSinceLastWorkout + (slot.day - today),
    streak: s.weekStreak || 0,
  };
};

const COMEBACK = [
  { title: "Let's get back to it", body: "You haven't logged a workout recently. A short session today can help keep your routine going." },
  { title: "Your routine is waiting", body: "Even a quick 15-minute session counts. Pick one exercise and get moving today." },
  { title: "Small steps add up", body: "It's been a few days since your last workout. A light session today keeps your progress alive." },
];

const morningMessage = (p) => {
  if (p.daysSince != null && p.daysSince >= 3) return COMEBACK[(p.daysSince - 3) % COMEBACK.length];
  if (p.weekWorkouts >= p.target) {
    return { title: "Weekly goal reached 🎉", body: "You completed your workouts this week. Keep the momentum going." };
  }
  const remaining = p.target - p.weekWorkouts;
  const planned = p.pending ? ` You have ${plural(p.pending, "planned workout")} in your tracker.` : "";
  if (p.weekWorkouts > 0) {
    return {
      title: "Time to train! 💪",
      body: `You've completed ${plural(p.weekWorkouts, "workout")} this week. ${remaining === 1 ? "One more session" : `${remaining} more sessions`} to stay on track.${planned}`,
    };
  }
  if (p.newWeek) {
    return { title: "New week, fresh start", body: `${plural(p.target, "session")} this week keeps you on track. Today's a great day to begin.${planned}` };
  }
  return { title: "Time to train! 💪", body: `No workouts logged yet this week — ${plural(p.target, "session")} keeps you on track.${planned}` };
};

// Evening messages celebrate real progress; each kind is used once per schedule
// so the same line doesn't repeat night after night.
const eveningMessage = (p, analytics, slot, used) => {
  const pr = analytics.recentPRs?.[0];
  if (pr && !used.has("pr") && slot.at - new Date(pr.date).getTime() < 7 * DAY_MS) {
    used.add("pr");
    return { title: "New personal record 🏆", body: `${pr.exercise}: ${pr.weightKg} kg (+${pr.improvementKg} kg over your previous best). Keep your form solid as you progress.` };
  }
  if (p.prevVolume > 0 && p.weekVolume > p.prevVolume && !used.has("volume")) {
    used.add("volume");
    return { title: "Great progress", body: "You lifted more total volume this week than last week. Progressive overload is moving in the right direction." };
  }
  if (p.streak >= 2 && !used.has("streak")) {
    used.add("streak");
    return { title: "Consistency pays off", body: `${p.streak} weeks in a row of training. Keep showing up.` };
  }
  return { title: "Daily motivation", body: randomQuote() };
};

const FALLBACK_MORNING = { title: "Time to train! 💪", body: "Your workout is waiting. Let's get moving." };

export const buildSchedule = (analytics, nowMs = Date.now()) => {
  const hasData = !!analytics?.summary?.totalWorkouts;
  const used = new Set();
  return upcomingSlots(nowMs).map((slot) => {
    let content;
    if (!hasData) {
      content = slot.kind === "morning" ? FALLBACK_MORNING : { title: "Daily motivation", body: randomQuote() };
    } else {
      const p = projectAt(slot, analytics, nowMs);
      content = slot.kind === "morning" ? morningMessage(p) : eveningMessage(p, analytics, slot, used);
    }
    return { ...slot, content };
  });
};

const fetchAnalytics = async () => {
  try {
    const res = await api.get("/workouts/analytics");
    return res.data;
  } catch (e) {
    console.log("Notification analytics unavailable", e.message);
    return null;
  }
};

export const requestPermission = async () => {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  const { status: newStatus } = await Notifications.requestPermissionsAsync();
  return newStatus === "granted";
};

// Replaces every scheduled reminder with a fresh, progress-based 8 AM / 8 PM plan.
export const scheduleProgressNotifications = async (analytics) => {
  const data = analytics === undefined ? await fetchAnalytics() : analytics;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const schedule = buildSchedule(data);
  for (const slot of schedule) {
    await Notifications.scheduleNotificationAsync({
      content: slot.content,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: slot.at },
    });
  }
  // Record the plan so the in-app inbox (bell) can show each reminder once its time passes.
  try {
    await setPlanned(schedule.map((s) => ({
      id: s.kind + "_" + s.at, title: s.content.title, body: s.content.body, at: s.at,
    })));
  } catch (_e) {}
};

let refreshing = null;

// Safe to call often (home focus, workout completed). No-op unless the user
// turned reminders on and permission is already granted — never prompts.
export const refreshProgressNotifications = async (analytics) => {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const saved = JSON.parse((await AsyncStorage.getItem(NOTIF_SETTINGS_KEY)) || "null");
      if (!saved?.enabled) return;
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") return;
      await scheduleProgressNotifications(analytics);
    } catch (e) {
      console.log("Failed to refresh notifications", e.message);
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// Shows what the next reminder would say right now, from real progress when available.
export const sendTestNotification = async () => {
  const next = buildSchedule(await fetchAnalytics())[0];
  const content = next?.content || { title: "Test notification ✅", body: randomQuote() };
  await Notifications.scheduleNotificationAsync({
    content,
    trigger: null,   // this is just for test only
  });
  // also drop it into the in-app inbox right away
  try { await logNotification({ title: content.title, body: content.body, at: Date.now() }); } catch (_e) {}
};
