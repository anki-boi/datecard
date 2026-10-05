// DEMO_MODE backend: the same API as db.js, persisted to localStorage.
// It plays both sides of the product in one browser — you can own a card,
// scan it as a stranger, apply, accept yourself, and watch the socials unlock.
// Sample owners (Alex, Rae, Miko) "accept" applications after a short pause.

import { SAMPLE_CARDS, SAMPLE_PEOPLE, NOTE_TEMPLATES, sampleCard } from "./samples.js";
import { generateId, pick, statsFrom } from "./util.js";
import { snippet } from "./openers.js";

const KEY = "datecard.demo.v1";
export const OWNER = "demo-owner";
export const STRANGER = "demo-stranger";
export const SAMPLE_ACCEPT_MS = 9000;

const blank = () => ({ user: null, premium: false, profiles: [], applications: [], events: [], myApps: [] });

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? { ...blank(), ...JSON.parse(raw) } : blank();
  } catch {
    return blank();
  }
}

function commit(next) {
  state = next;
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked: keep in memory */ }
  listeners.forEach((fn) => fn());
}

/** Re-render hook: components call subscribe() to hear about demo writes. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetDemo() { commit(blank()); }
export const getState = () => state;
export function setPremium(on) { commit({ ...state, premium: !!on }); }

// ─── AUTH ────────────────────────────────────────────────────────────────────

export async function getUser() { return state.user; }
export async function signIn(provider) {
  commit({ ...state, user: { id: OWNER, provider, name: "Demo user" } });
  return state.user;
}
export async function signOut() { commit({ ...state, user: null }); }

// ─── PROFILES ────────────────────────────────────────────────────────────────

const strip = ({ socials, ...rest }) => rest;
const ownProfile = (id) => state.profiles.find((p) => p.id === id);

export async function getMyProfiles() {
  return state.user ? state.profiles : [];
}

export async function saveProfile(p) {
  const isNew = !ownProfile(p.id);
  const now = new Date().toISOString();
  const row = { ...p, updated_at: now, created_at: p.created_at || now };
  let next = { ...state, profiles: [...state.profiles.filter((x) => x.id !== p.id && x.type !== p.type), row] };
  if (isNew) next = seedActivity(next, row);
  commit(next);
  return row;
}

/** A brand-new demo card gets a little history so the dashboard isn't a ghost town. */
function seedActivity(s, card) {
  const now = Date.now();
  const events = [...s.events];
  for (let d = 13; d >= 0; d--) {
    const views = Math.max(0, Math.round(2 + Math.sin(d / 2) * 2 + Math.random() * 4 - (d > 9 ? 2 : 0)));
    for (let i = 0; i < views; i++) events.push({ profile_id: card.id, kind: "view", at: new Date(now - d * 864e5 - Math.random() * 864e5).toISOString() });
  }
  const apps = [...s.applications];
  [[2, "pending"], [26, "pending"], [50, "accepted"]].forEach(([hoursAgo, status]) => {
    const app = fakeApplicant(card, new Date(now - hoursAgo * 36e5).toISOString(), status, apps);
    apps.push(app);
    events.push({ profile_id: card.id, kind: "apply", at: app.created_at });
  });
  return { ...s, events, applications: apps };
}

function fakeApplicant(card, created_at = new Date().toISOString(), status = "pending", existing = state.applications) {
  const taken = new Set(existing.filter((a) => a.profile_id === card.id).map((a) => a.name));
  const pool = SAMPLE_PEOPLE.filter(([n]) => !taken.has(n));
  const [name, emoji, platform, handle] = pick(pool.length ? pool : SAMPLE_PEOPLE);
  const answered = (card.prompts || []).filter((p) => p.answer?.trim());
  const s = answered.length ? snippet(pick(answered).answer, 6) : (card.interests?.[0] || "your card").toLowerCase();
  return {
    id: generateId(), profile_id: card.id, applicant_id: `fake-${generateId(4)}`,
    name, emoji, platform, handle, note: pick(NOTE_TEMPLATES)(s), status, created_at,
  };
}

/** "Simulate a scan": a stranger views the card, and usually applies. */
export async function simulateScan(profileId) {
  const card = ownProfile(profileId);
  if (!card) return null;
  const at = new Date().toISOString();
  const events = [...state.events, { profile_id: profileId, kind: "view", at }];
  if (card.status === "paused" || Math.random() < 0.2) {
    commit({ ...state, events });
    return null; // looked, didn't apply — that's analytics too
  }
  const app = fakeApplicant(card, at);
  commit({ ...state, events: [...events, { profile_id: profileId, kind: "apply", at }], applications: [...state.applications, app] });
  return app;
}

export async function getPublicProfile(id) {
  const own = ownProfile(id);
  if (own) return { ...strip(own), isMine: !!state.user };
  const sample = sampleCard(id);
  return sample ? { ...strip(sample), isMine: false } : null;
}

export async function revealSocials(profileId, viewer = STRANGER) {
  const card = ownProfile(profileId) || sampleCard(profileId);
  if (!card) return null;
  if (viewer === OWNER && ownProfile(profileId)) return card.socials;
  const ok = state.applications.some((a) => a.profile_id === profileId && a.applicant_id === viewer && a.status === "accepted");
  return ok ? card.socials : null;
}

// ─── APPLICATIONS ────────────────────────────────────────────────────────────

export async function getApplications(profileId) {
  return state.applications
    .filter((a) => a.profile_id === profileId)
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

/** Sample owners accept after SAMPLE_ACCEPT_MS — even if the tab was closed in between. */
function settleSamples() {
  const due = state.applications.filter((a) => a.status === "pending" && sampleCard(a.profile_id)
    && Date.now() - new Date(a.created_at).getTime() >= SAMPLE_ACCEPT_MS);
  due.forEach((a) => setApplicationStatus(a.id, "accepted"));
}

export async function getApplication(id) {
  settleSamples();
  return state.applications.find((a) => a.id === id) || null;
}

export async function submitApplication(profileId, { note = "", provider = "google" } = {}) {
  const card = ownProfile(profileId) || sampleCard(profileId);
  if (!card) throw new Error("Card not found");
  if (card.status === "paused") throw new Error("This card is paused");
  const existing = state.applications.find((a) => a.profile_id === profileId && a.applicant_id === STRANGER);
  if (existing) return existing;
  const app = {
    id: generateId(), profile_id: profileId, applicant_id: STRANGER,
    name: "You (as a stranger)", emoji: "✨", platform: provider, handle: "@you",
    note, status: "pending", created_at: new Date().toISOString(),
  };
  commit({
    ...state,
    applications: [...state.applications, app],
    events: [...state.events, { profile_id: profileId, kind: "apply", at: app.created_at }],
    myApps: [app.id, ...state.myApps],
  });
  if (card.sample) setTimeout(() => setApplicationStatus(app.id, "accepted"), SAMPLE_ACCEPT_MS);
  return app;
}

export async function setApplicationStatus(appId, status) {
  const app = state.applications.find((a) => a.id === appId);
  if (!app) return;
  const events = status === "accepted"
    ? [...state.events, { profile_id: app.profile_id, kind: "accept", at: new Date().toISOString() }]
    : state.events;
  commit({ ...state, events, applications: state.applications.map((a) => (a.id === appId ? { ...a, status, decided_at: new Date().toISOString() } : a)) });
}

export async function getMyApplications() {
  const rows = [];
  for (const id of state.myApps) {
    const app = await getApplication(id);
    if (app) rows.push({ app, profile: await getPublicProfile(app.profile_id) });
  }
  return rows;
}

// ─── EVENTS ──────────────────────────────────────────────────────────────────

export async function logEvent(profileId, kind) {
  commit({ ...state, events: [...state.events, { profile_id: profileId, kind, at: new Date().toISOString() }] });
}

export async function getEventStats(profileId) {
  return statsFrom(state.events.filter((e) => e.profile_id === profileId));
}

// ─── PHOTOS ──────────────────────────────────────────────────────────────────

/** Demo photos live in localStorage as small JPEG data URLs. */
export async function uploadPhoto(_cardId, blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export { SAMPLE_CARDS };
