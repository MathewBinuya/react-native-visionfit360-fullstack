// Exercise demonstrations from AscendAPI (formerly ExerciseDB) — FREE tier.
//
// Terms we follow (docs.ascendapi.com, checked 2026-10-02):
//  - Free tier = NON-COMMERCIAL use only, attribution to AscendAPI required.
//    VisionFit 360 is a school project and will not be published, so this fits.
//    Publishing or monetising the app needs a paid plan / different license.
//  - Free plans do NOT permit caching: "you must not store any data returned by
//    the API. All requests must be made in real-time." Media URLs rotate weekly.
//    So we NEVER store gifUrl (not in code, AsyncStorage, or on disk) and never
//    download/bundle the GIFs — we fetch a fresh URL every time the guide opens.
//  - Exercise IDs are stable ("you may treat them as permanent identifiers"),
//    so AR_EXERCISES stores only the AscendAPI exerciseId for each key.
//  - Media is served from AscendAPI's CDN; we reference it directly (no proxy).

const BASE_URL = "https://oss.exercisedb.dev/api/v1/exercises";
const TIMEOUT_MS = 10000;

export const DEMO_ATTRIBUTION = "Exercise demo by AscendAPI (ExerciseDB) · ascendapi.com";

// Returns { gifUrl, name } for an AscendAPI exerciseId, or null on any failure
// (offline, timeout, rate limit, unknown id, malformed response).
export async function fetchExerciseDemo(exerciseId) {
  if (!exerciseId) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(exerciseId)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data;
    const gifUrl = typeof data?.gifUrl === "string" ? data.gifUrl : null;
    // only accept https media from AscendAPI's CDN
    if (!gifUrl || !/^https:\/\/[^/]*exercisedb\.dev\//.test(gifUrl)) return null;
    return { gifUrl, name: typeof data?.name === "string" ? data.name : "" };
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
