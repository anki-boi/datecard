/**
 * AI-assisted card builder (SPEC.md §5.1.3).
 * Client-side Gemini call for now — the API key ships in the frontend env.
 * NOTE: for production, proxy this through a Supabase Edge Function so the
 * key never ships in the bundle. See SPEC.md roadmap P2.
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";

export function aiAvailable() {
  return !!API_KEY;
}

const PROMPT_POOLS = {
  serious: [
    "The way to my heart is...", "I'm looking for someone who...", "My love language is...",
    "A perfect Sunday looks like...", "You'll know I like you when...", "I want someone who will...",
    "My biggest green flag is...", "I'm still learning how to...", "Favourite thing about myself is...",
    "My friends would describe me as...", "I'm convinced that...", "Together we could...",
    "Change my mind about...", "I'll cook you...", "Don't go on a date with me if...",
    "The best trip I ever took...", "I get way too excited about...", "I'm weirdly passionate about...",
  ],
  casual: [
    "My idea of a good time is...", "The vibe I'm going for is...", "I keep things interesting by...",
    "Dealbreaker for me is...", "I'm upfront about...", "Best spontaneous thing I've done...",
    "Zero expectations but I do want...", "My energy is best described as...",
    "I set the tone by...", "Come as you are, just...",
  ],
  friendship: [
    "I'm looking for someone to...", "My ideal hang is...", "I get way too excited about...",
    "My friends would describe me as...", "I'm weirdly passionate about...", "A perfect Saturday looks like...",
    "I'm new here and need...", "Best way to spend a Tuesday night...", "I'm the friend who always...",
    "We'd get along if you also...", "My love language (platonic) is...", "Change my mind about...",
  ],
};

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

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, responseMimeType: "application/json" },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

export { INTERVIEW };
