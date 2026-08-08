import { supabase, DEMO_MODE } from "./supabase";

/**
 * Data layer — the SPEC.md contract.
 * One account → up to 3 profiles (one per card type). Account is private;
 * public pages only ever see get_public_profile() output (socials excluded).
 * Socials are revealed ONLY via reveal_socials() (owner or accepted applicant).
 *
 * All functions no-op safely in DEMO_MODE (mock data lives in App.jsx).
 */

const toCamel = (r) => ({
  ...r,
  lookingFor: r.looking_for,
  looking_for: undefined,
});

const toCamelApp = (r) => ({
  ...r,
  applicantId: r.applicant_id,
  applicant_id: undefined,
});

// ─── PROFILES ────────────────────────────────────────────────────────────────

export async function getMyProfiles(ownerId) {
  if (DEMO_MODE) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at");
  if (error) throw error;
  return (data || []).map(toCamel);
}

/** Public card view — goes through the RPC so socials can never leak. */
export async function getProfileById(id) {
  if (DEMO_MODE) return null;
  const { data, error } = await supabase.rpc("get_public_profile", { p_id: id });
  if (error) throw error;
  return data && data.length ? toCamel(data[0]) : null;
}

/** Socials reveal — owner or accepted applicant only (enforced in SQL). */
export async function getRevealedSocials(profileId) {
  if (DEMO_MODE) return null;
  const { data, error } = await supabase.rpc("reveal_socials", { p_id: profileId });
  if (error) throw error;
  return data || null;
}

export async function upsertProfile(p) {
  if (DEMO_MODE) return;
  const { error } = await supabase.from("profiles").upsert(
    {
      id: p.id,
      owner_id: p.owner_id,
      type: p.type,
      name: p.name,
      age: p.age ? Number(p.age) : null,
      location: p.location,
      bio: p.bio,
      interests: p.interests || [],
      hobbies: p.hobbies || [],
      looking_for: p.lookingFor,
      prompts: p.prompts || [],
      socials: p.socials || {},
      photo_url: p.photo_url || null,
      status: p.status || "active",
      settings: p.settings || {},
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

// ─── APPLICATIONS ────────────────────────────────────────────────────────────

export async function getApplications(profileId) {
  if (DEMO_MODE) return [];
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(toCamelApp);
}

export async function getApplicationById(id) {
  if (DEMO_MODE) return null;
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toCamelApp(data) : null;
}

export async function addApplication(profileId, app) {
  if (DEMO_MODE) return;
  const { error } = await supabase.from("applications").insert({
    id: app.id,
    profile_id: profileId,
    applicant_id: app.applicant_id || null,
    name: app.name,
    handle: app.handle,
    platform: app.platform,
    emoji: app.emoji,
    note: app.note,
    status: "pending",
  });
  if (error) throw error;
}

export async function updateApplication(profileId, appId, status) {
  if (DEMO_MODE) return;
  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", appId);
  if (error) throw error;
}

// ─── EVENTS ──────────────────────────────────────────────────────────────────

export async function logEvent(profileId, kind) {
  if (DEMO_MODE) return;
  const { error } = await supabase.from("events").insert({ profile_id: profileId, kind });
  if (error) console.warn("logEvent failed:", error.message);
}
