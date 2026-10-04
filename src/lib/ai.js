/**
 * AI-assisted card builder (SPEC.md §5.1.3).
 * Client-side Gemini call for now — the API key ships in the frontend env.
 * NOTE: for production, proxy this through a Supabase Edge Function so the
 * key never ships in the bundle. See SPEC.md roadmap P2.
 */

import { PROMPTS_BY_TYPE as PROMPT_POOLS } from "./constants.js";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";

export function aiAvailable() {
  return !!API_KEY;
}

const INTERVIEW = [
  { q: "What does an ideal week look like for you?", hint: "Work, play, rest — paint a real week." },
  { q: "What's something you're unreasonably good at that no one knows?", hint: "Party trick, skill, weird talent." },
  { q: "What's a hill you'll die on?", hint: "A take, a principle, a food opinion." },
  { q: "What do your friends quote you saying?", hint: "The line they repeat back to you." },
  { q: "What are you looking for right now, honestly?", hint: "One honest sentence. No clichés." },
  { q: "What's a date that would actually be fun for you?", hint: "Specific beats generic." },
];

export async function compileCard(answers, type) {
  if (!API_KEY) throw new Error("VITE_GEMINI_API_KEY not set");
  const pool = PROMPT_POOLS[type] || PROMPT_POOLS.serious;
  const qa = answers
    .filter((a) => a.answer.trim())
    .map((a) => `Q: ${a.q}\nA: ${a.answer}`)
    .join("\n\n");

  const prompt = `You are writing a dating-profile card for someone who just answered a short interview. Write in THEIR voice — real, specific, no clichés, no corporate polish. No generic lines like "I love traveling". Use their actual answers as raw material.

Interview answers:
${qa}

Card type: ${type}

Return ONLY valid JSON (no markdown fences) with exactly this shape:
{
  "bio": "3-4 sentences, first person, specific and warm",
  "lookingFor": "one honest sentence",
  "prompts": [
    {"prompt": "<exact prompt from this allowed pool>", "answer": "<specific answer, first person>"},
    {"prompt": "<exact prompt from this allowed pool>", "answer": "<specific answer, first person>"},
    {"prompt": "<exact prompt from this allowed pool>", "answer": "<specific answer, first person>"}
  ],
  "interests": ["3-5 short interest tags"]
}

Allowed prompt pool (use exactly these strings):
${pool.map((p) => `- ${p}`).join("\n")}

Rules: prompts must be from the pool verbatim; answers must draw on the interview; interests are short tags, not sentences.`;

  const out = await gemini(prompt, 0.85);
  // Keep only prompts that really are in the pool — the model sometimes paraphrases.
  if (Array.isArray(out.prompts)) out.prompts = out.prompts.filter((p) => pool.includes(p?.prompt)).slice(0, 3);
  return out;
}

/** AI-written openers for an accepted applicant (optional — lib/openers.js works offline). */
export async function aiOpeners(profile) {
  const card = JSON.stringify({ name: profile.name, bio: profile.bio, lookingFor: profile.lookingFor, prompts: profile.prompts, interests: profile.interests });
  const out = await gemini(`Someone was just accepted to connect with the person on this dating card. Write 3 short first messages they could send. Each must reference something specific on the card, sound like a real person texting (lowercase is fine), be under 25 words, and avoid pickup lines and compliments on looks.

Card: ${card}

Return ONLY JSON: {"openers": ["...", "...", "..."]}`, 1.0);
  return Array.isArray(out.openers) ? out.openers.slice(0, 3) : [];
}

async function gemini(prompt, temperature) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, responseMimeType: "application/json" },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

export { INTERVIEW };
