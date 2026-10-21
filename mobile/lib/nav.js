import { router } from 'expo-router';

// Safe "go back": return to the previous screen when there IS one, otherwise land on a
// sensible home screen. Prevents expo-router's dev warning
//   "The action 'GO_BACK' was not handled by any navigator"
// which fires when a screen is entered directly — a deep link, a notification tap, or a
// Fast Refresh reload that leaves the screen with no navigation history behind it.
export function goBack(fallback = '/(tabs)/home') {
  try {
    if (router.canGoBack()) { router.back(); return; }
  } catch (_e) {}
  router.replace(fallback);
}
