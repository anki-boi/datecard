// Small pure helpers: ids, urls, visibility, time.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — readable off a printed card

/** 8-char card/application id from crypto randomness (Math.random was guessable and sometimes short). */
export function generateId(len = 8) {
  const bytes = new Uint8Array(len);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/**
 * Public base URL for links and QR codes. Self-hosters get their own domain for free:
 * VITE_PUBLIC_URL if set, otherwise wherever the app is running.
 */
export function baseUrl() {
  const env = import.meta.env?.VITE_PUBLIC_URL;
  if (env) return env.replace(/\/+$/, "");
  return typeof window !== "undefined" ? window.location.origin : "https://datecard.app";
}

export const cardUrl = (id) => `${baseUrl()}/p/${id}`;
export const appUrl = (id) => `${baseUrl()}/a/${id}`;
export const prettyUrl = (url) => url.replace(/^https?:\/\//, "");

/** SPEC §5.4 — casual cards never show a city; the others honour the toggle. */
export function canShowLocation(p) {
  if (!p || p.type === "casual") return false;
  return p.settings?.showLocation !== false;
}

/** "just now", "5 min ago", "3 hours ago", "Yesterday", "4 days ago", "Mar 2". */
export function timeAgo(iso, now = Date.now()) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return String(iso);
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Deterministic PRNG from a string seed, so "random" picks are stable per card/application. */
export function seededRandom(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (let i = 0; i < String(seed).length; i++) {
    h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export const pick = (arr, rnd = Math.random) => arr[Math.floor(rnd() * arr.length)];

/** Compact "how complete is this card" score with the next best thing to add. */
export function cardStrength(p) {
  const checks = [
    [!!p.name, "Add your name"],
    [!!p.photo_url, "Add a photo — cards with a face get read"],
    [(p.bio || "").trim().length >= 60, "Write a bio with a bit more to it"],
    [(p.prompts || []).filter((x) => x.answer?.trim()).length >= 2, "Answer at least two prompts"],
    [(p.prompts || []).filter((x) => x.answer?.trim()).length >= 3, "Answer a third prompt"],
    [(p.interests || []).length >= 3, "Add three or more interests"],
    [!!(p.lookingFor || "").trim(), "Say what you're looking for"],
    [Object.values(p.socials || {}).some((v) => v && v.trim()), "Add at least one social to reveal"],
  ];
  const done = checks.filter(([ok]) => ok).length;
  return { score: Math.round((done / checks.length) * 100), next: checks.find(([ok]) => !ok)?.[1] || null };
}

/** Shared by demo + live: counts per kind and a 14-day view histogram. */
export function statsFrom(events, now = Date.now()) {
  const count = (k) => events.filter((e) => e.kind === k).length;
  const daily = Array(14).fill(0);
  for (const e of events) {
    if (e.kind !== "view") continue;
    const d = Math.floor((now - new Date(e.at || e.created_at).getTime()) / 864e5);
    if (d >= 0 && d < 14) daily[13 - d]++;
  }
  return { views: count("view"), applies: count("apply"), accepts: count("accept"), reports: count("report"), daily };
}
