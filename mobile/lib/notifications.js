import * as Notifications from "expo-notifications";

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

export const requestPermission = async () => {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  const { status: newStatus } = await Notifications.requestPermissionsAsync();
  return newStatus === "granted";
};

export const scheduleDailyNotifications = async (morningHour, morningMinute, eveningHour, eveningMinute) => {
  await Notifications.cancelAllScheduledNotificationsAsync();

  // morning workout reminder — note the new DAILY trigger type
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time to train! 💪",
      body: "Your workout is waiting. Let's get moving.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: morningHour,
      minute: morningMinute,
    },
  });

  // evening motivational quote
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Daily motivation",
      body: randomQuote(),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: eveningHour,
      minute: eveningMinute,
    },
  });
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const sendTestNotification = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Test notification ✅",
      body: randomQuote(),
    },
    trigger: null,   // this is just for test only
  });
};