import { supabase, DEMO_MODE } from "./supabase";

/**
 * Data layer: one account → up to 3 profiles (one per card type: serious,
 * casual, friendship). Each profile has its OWN socials/prompts/photo —
 * public pages never link profiles to each other or to the account.
 *
 * All functions no-op safely in DEMO_MODE (mock data lives in App.jsx).
 */

const toCamel = (r) => ({
  ...r,
  lookingFor: r.looking_for,
  looking_for: undefined,
});

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

export async function getProfileById(id) {
  if (DEMO_MODE) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toCamel(data) : null;
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
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

export async function getApplications(profileId) {
  if (DEMO_MODE) return [];
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addApplication(profileId, app) {
  if (DEMO_MODE) return;
  const { error } = await supabase.from("applications").insert({
    id: app.id,
    profile_id: profileId,
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
