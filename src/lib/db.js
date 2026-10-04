import { supabase } from "./supabase.js";
import { generateId, statsFrom } from "./util.js";

/**
 * Live data layer — the SPEC.md contract, same API as demo.js.
 * One account → up to 3 profiles (one per card type). Account is private;
 * public pages only ever see get_public_profile() output (no socials, no owner_id).
 * Socials are revealed ONLY via reveal_socials() (owner or accepted applicant).
 */

const toProfile = (r) => {
  const { looking_for, is_mine, ...rest } = r;
  return { ...rest, lookingFor: looking_for, isMine: !!is_mine };
};

export const subscribe = () => () => {};

// ─── AUTH ────────────────────────────────────────────────────────────────────

const toUser = (u) => u && {
  id: u.id,
  provider: u.app_metadata?.provider || "email",
  name: u.user_metadata?.full_name || u.user_metadata?.name || "",
  handle: u.user_metadata?.user_name || u.user_metadata?.preferred_username || "",
  avatar: u.user_metadata?.avatar_url || null,
};

export async function getUser() {
  const { data } = await supabase.auth.getSession();
  return toUser(data.session?.user);
}

export function onAuthChange(fn) {
  const { data } = supabase.auth.onAuthStateChange((_e, session) => fn(toUser(session?.user)));
  return () => data.subscription.unsubscribe();
}

/** Redirects away; callers stash any in-progress form in sessionStorage first (see lib/drafts.js). */
export async function signIn(provider) {
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.href } });
  if (error) throw error;
}

export async function signOut() { await supabase.auth.signOut(); }

// ─── PROFILES ────────────────────────────────────────────────────────────────

export async function getMyProfiles(ownerId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("owner_id", ownerId).order("created_at");
  if (error) throw error;
  return (data || []).map(toProfile);
}

export async function saveProfile(p) {
  const { data: s } = await supabase.auth.getSession();
  const ownerId = s.session?.user?.id;
  if (!ownerId) throw new Error("Sign in to save your card");
  const row = {
    id: p.id, owner_id: ownerId, type: p.type, name: p.name,
    age: p.age ? Number(p.age) : null, location: p.location || null, bio: p.bio || null,
    interests: p.interests || [], hobbies: p.hobbies || [], looking_for: p.lookingFor || null,
    prompts: p.prompts || [], socials: p.socials || {}, photo_url: p.photo_url || null,
    status: p.status || "active", settings: p.settings || {}, updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("profiles").upsert(row, { onConflict: "id" }).select().single();
  if (error) throw error;
  return toProfile(data);
}

/** Public card view — goes through the RPC so socials and owner_id can never leak. */
export async function getPublicProfile(id) {
  const { data, error } = await supabase.rpc("get_public_profile", { p_id: id });
  if (error) throw error;
  return data && data.length ? toProfile(data[0]) : null;
}

/** Socials reveal — owner or accepted applicant only (enforced in SQL). */
export async function revealSocials(profileId) {
  const { data, error } = await supabase.rpc("reveal_socials", { p_id: profileId });
  if (error) throw error;
  return data || null;
}

// ─── APPLICATIONS ────────────────────────────────────────────────────────────

export async function getApplications(profileId) {
  const { data, error } = await supabase.from("applications").select("*")
    .eq("profile_id", profileId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getApplication(id) {
  const { data, error } = await supabase.from("applications").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data || null;
}

const EMOJI = ["🌿", "🎸", "📚", "🌙", "🎯", "🌊", "🍜", "🎨", "🏃", "🎧", "🧗", "🌻", "☕", "📷"];

/** The applicant is whoever is signed in — name/handle come from their OAuth profile. */
export async function submitApplication(profileId, { note = "" } = {}) {
  const user = await getUser();
  if (!user) throw new Error("Sign in to apply");
  const app = {
    id: generateId(), profile_id: profileId, applicant_id: user.id,
    name: user.name || "Someone who scanned your card",
    handle: user.handle ? `@${user.handle}` : "", platform: user.provider,
    emoji: EMOJI[Math.floor(Math.random() * EMOJI.length)], note, status: "pending",
  };
  const { error } = await supabase.from("applications").insert(app);
  if (error) {
    if (/row-level security/i.test(error.message)) throw new Error("This card isn't taking applications right now.");
    throw error;
  }
  logEvent(profileId, "apply");
  return { ...app, created_at: new Date().toISOString() };
}

export async function setApplicationStatus(appId, status) {
  const { data, error } = await supabase.from("applications").update({ status }).eq("id", appId).select("profile_id").single();
  if (error) throw error;
  if (status === "accepted") logEvent(data.profile_id, "accept");
}

/** Applicant side: every application the signed-in user has sent, with the card it went to. */
export async function getMyApplications() {
  const user = await getUser();
  if (!user) return [];
  const { data, error } = await supabase.from("applications").select("*")
    .eq("applicant_id", user.id).order("created_at", { ascending: false });
  if (error) throw error;
  return Promise.all((data || []).map(async (app) => ({ app, profile: await getPublicProfile(app.profile_id).catch(() => null) })));
}

// ─── EVENTS ──────────────────────────────────────────────────────────────────

export async function logEvent(profileId, kind) {
  const { error } = await supabase.from("events").insert({ profile_id: profileId, kind });
  if (error) console.warn("logEvent failed:", error.message);
}

export async function getEventStats(profileId) {
  const { data, error } = await supabase.from("events").select("kind, created_at").eq("profile_id", profileId);
  if (error) throw error;
  return statsFrom(data || []);
}

// ─── PHOTOS (Supabase Storage bucket "photos", see schema.sql) ───────────────

export async function uploadPhoto(cardId, blob) {
  const user = await getUser();
  if (!user) throw new Error("Sign in to upload a photo");
  const path = `${user.id}/${cardId}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("photos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
}
