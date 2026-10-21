import AsyncStorage from "@react-native-async-storage/async-storage";

// In-app notification feed (the bell). Because reminders fire through the OS on a
// schedule we generate ourselves, we keep the feed reliable WITHOUT depending on
// background listeners: scheduleProgressNotifications() records the plan (setPlanned),
// and reconcileInbox() — called whenever the user opens the dashboard or the inbox —
// moves any planned reminder whose fire time has passed into the stored feed, with the
// exact time/date it was due. logNotification() handles one-off items (e.g. the test).

const INBOX_KEY = "notifInbox_v1";    // [{ id, title, body, at }] — delivered/seen items
const PLANNED_KEY = "notifPlanned_v1"; // [{ id, title, body, at }] — future scheduled items
const READ_KEY = "notifInboxReadAt_v1"; // ms timestamp the feed was last viewed
const MAX_ENTRIES = 100;

const read = async (key, fallback) => {
  try { const r = await AsyncStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch (_e) { return fallback; }
};
const write = async (key, val) => { try { await AsyncStorage.setItem(key, JSON.stringify(val)); } catch (_e) {} };

const byNewest = (a, b) => b.at - a.at;

export const getInbox = async () => (await read(INBOX_KEY, [])).sort(byNewest);

// Record the deterministic schedule so fired reminders can later enter the feed.
export const setPlanned = async (planned) => { await write(PLANNED_KEY, Array.isArray(planned) ? planned : []); };

// Move planned reminders whose time has passed into the feed (dedup by id).
export const reconcileInbox = async (nowMs = Date.now()) => {
  const planned = await read(PLANNED_KEY, []);
  if (!planned.length) return getInbox();
  const inbox = await read(INBOX_KEY, []);
  const have = new Set(inbox.map((e) => e.id));
  const stillFuture = [];
  for (const p of planned) {
    if (p.at <= nowMs) { if (!have.has(p.id)) { inbox.push(p); have.add(p.id); } }
    else stillFuture.push(p);
  }
  const trimmed = inbox.sort(byNewest).slice(0, MAX_ENTRIES);
  await write(INBOX_KEY, trimmed);
  await write(PLANNED_KEY, stillFuture);
  return trimmed;
};

// Add one item immediately (test notification, or a foreground receipt).
export const logNotification = async ({ id, title, body, at } = {}) => {
  const inbox = await read(INBOX_KEY, []);
  const key = id || `${title || "n"}_${at || Date.now()}`;
  if (inbox.some((e) => e.id === key)) return;
  inbox.push({ id: key, title: title || "Notification", body: body || "", at: at || Date.now() });
  await write(INBOX_KEY, inbox.sort(byNewest).slice(0, MAX_ENTRIES));
};

export const unreadCount = async () => {
  const [inbox, readAt] = await Promise.all([getInbox(), read(READ_KEY, 0)]);
  return inbox.filter((e) => e.at > (readAt || 0)).length;
};

export const markAllRead = async () => { await write(READ_KEY, Date.now()); };

export const clearInbox = async () => { await write(INBOX_KEY, []); };
