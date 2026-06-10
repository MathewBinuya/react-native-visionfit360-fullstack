// NOTE: Notifications are guarded for Expo Go (they do nothing there).
// To make them work: set up a development build (expo-dev-client + eas build),
// then they function fully with no code changes needed.


// import * as Notifications from "expo-notifications";
// import Constants from "expo-constants";

// const isExpoGo = Constants.appOwnership === "expo";

// only set the handler outside Expo Go (avoids the push auto-registration crash)
// if (!isExpoGo) {
//   Notifications.setNotificationHandler({
//     handleNotification: async () => ({
//       shouldShowAlert: true,
//       shouldPlaySound: true,
//       shouldSetBadge: false,
//     }),
//   });
// }

// const QUOTES = [
//   "Push yourself, because no one else will do it for you.",
//   "The body achieves what the mind believes.",
//   "Sweat now, shine later.",
//   "Don't wish for it, work for it.",
//   "Your only limit is you.",
//   "Strong is the new strong.",
//   "Wake up. Work out. Look hot. Kick ass.",
//   "A one-hour workout is 4% of your day. No excuses.",
//   "Success starts with self-discipline.",
//   "The pain you feel today is the strength you feel tomorrow.",
//   "Train insane or remain the same.",
//   "Fall in love with taking care of yourself.",
//   "Discipline is choosing what you want most over what you want now.",
//   "Little by little, a little becomes a lot.",
//   "You don't have to be extreme, just consistent.",
//   "Doubt me. Hate me. You're the inspiration I need.",
//   "Energy and persistence conquer all things.",
//   "The hardest lift of all is lifting your butt off the couch.",
//   "Be stronger than your excuses.",
//   "Results happen over time, not overnight.",
// ];

// const randomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

// // ask the OS for permission. returns true if granted.
// export const requestPermission = async () => {
//   if (isExpoGo) return false;
//   const { status } = await Notifications.getPermissionsAsync();
//   if (status === "granted") return true;
//   const { status: newStatus } = await Notifications.requestPermissionsAsync();
//   return newStatus === "granted";
// };

// // schedule both daily notifications. cancels any existing ones first.
// export const scheduleDailyNotifications = async (morningHour, morningMinute, eveningHour, eveningMinute) => {
//   if (isExpoGo) return;
//   await Notifications.cancelAllScheduledNotificationsAsync();

//   // morning workout reminder
//   await Notifications.scheduleNotificationAsync({
//     content: {
//       title: "Time to train! 💪",
//       body: "Your workout is waiting. Let's get moving.",
//     },
//     trigger: { hour: morningHour, minute: morningMinute, repeats: true },
//   });

//   // evening motivational quote
//   await Notifications.scheduleNotificationAsync({
//     content: {
//       title: "Daily motivation",
//       body: randomQuote(),
//     },
//     trigger: { hour: eveningHour, minute: eveningMinute, repeats: true },
//   });
// };

// // turn everything off
// export const cancelAllNotifications = async () => {
//   if (isExpoGo) return;
//   await Notifications.cancelAllScheduledNotificationsAsync();
// };

// // fire one immediately (for testing/demo)
// export const sendTestNotification = async () => {
//   if (isExpoGo) return;
//   await Notifications.scheduleNotificationAsync({
//     content: {
//       title: "Test notification ✅",
//       body: randomQuote(),
//     },
//     trigger: null,   // null = fire right now
//   });
// };

// // helper so the UI can tell the user why notifications don't work in Expo Go
// export const notificationsAvailable = () => !isExpoGo;