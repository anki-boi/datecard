// One data API, two backends. Components import from here and never care
// whether they're talking to Supabase or to the in-browser demo store.

import { DEMO_MODE } from "./supabase.js";
import * as demo from "./demo.js";
import * as live from "./db.js";

const impl = DEMO_MODE ? demo : live;

export const {
  getUser, signIn, signOut,
  getMyProfiles, saveProfile, getPublicProfile, revealSocials,
  getApplications, getApplication, submitApplication, setApplicationStatus, getMyApplications,
  logEvent, getEventStats, uploadPhoto, subscribe,
} = impl;

export const onAuthChange = DEMO_MODE
  ? (fn) => demo.subscribe(() => fn(demo.getState().user))
  : live.onAuthChange;

/** Premium is a flag until payments exist (SPEC §3). Self-hosters can unlock everything. */
export function isPremium() {
  if (import.meta.env.VITE_UNLOCK_PREMIUM === "true") return true;
  return DEMO_MODE && demo.getState().premium;
}

export { DEMO_MODE };
