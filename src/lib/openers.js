// First-message openers (SPEC §8.2: "the product hands you the opener").
// Deterministic and offline: built from the card's own prompt answers and
// interests, seeded by the application id so the same person always sees the
// same three. The AI builder can do fancier ones; these never need a key.

import { seededRandom } from "./util.js";

/** First sentence of an answer, trimmed to a quotable fragment. */
export function snippet(answer, maxWords = 9) {
  const first = String(answer || "").trim().split(/(?<=[.!?])\s/)[0].replace(/[.!?…]+$/, "");
  const words = first.split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  let s = words.slice(0, maxWords).join(" ");
  if (words.length > maxWords) s += "…";
  // lowercase the first letter unless it's "I"/"I'm" or looks like a proper noun pair ("New York")
  if (!/^I\b|^I'/.test(s) && !/^[A-Z][a-z]+ [A-Z]/.test(s)) s = s[0].toLowerCase() + s.slice(1);
  return s;
}

const BY_PROMPT = {
  "I get way too excited about...":     (s) => `Okay, "${s}" — I need your top three. Ranked. No ties allowed.`,
  "A perfect Sunday looks like...":     () => `Your perfect Sunday sounds suspiciously like mine. Which part are we doing first?`,
  "A perfect Saturday looks like...":   () => `Your perfect Saturday is a whole itinerary. Am I allowed to pick one stop?`,
  "You'll know I like you when...":     (s) => `Noted: "${s}". I'll be keeping an eye out.`,
  "The way to my heart is...":          (s) => `"${s}" — that's specific. I respect specific.`,
  "I'll cook you...":                   (s) => `I'm holding you to the "${s}" offer. I'll bring dessert.`,
  "Change my mind about...":            (s) => `I'm here to change your mind about ${s}. I came prepared.`,
  "Don't go on a date with me if...":   (s) => `Good news: I passed the "${s}" test. Bad news: I have follow-up questions.`,
  "I'm weirdly passionate about...":    (s) => `Tell me more about ${s}. Like, the 20-minute version.`,
  "My love language is...":             (s) => `"${s}" is a great love language. Mine's sending voice notes at bad times.`,
  "The best trip I ever took...":       (s) => `"${s}" — okay, what's the story you only tell after the second drink?`,
  "My friends would describe me as...": (s) => `Your friends say "${s}". What would you say they're getting wrong?`,
  "I'm convinced that...":              (s) => `Convinced that ${s}? Defend it. I'm listening.`,
  "My ideal hang is...":                (s) => `"${s}" sounds like a plan. When are we doing it?`,
  "I'm the friend who always...":       (s) => `Every group needs the friend who always ${s}. I'd like to apply for that group.`,
  "We'd get along if you also...":      () => `Checked your list. I think I qualify — want to test it?`,
  "Best way to spend a Tuesday night...": (s) => `"${s}" on a Tuesday is elite behaviour. I'm in.`,
  "I'm new here and need...":           (s) => `Heard you need ${s}. I know a place.`,
  "My idea of a good time is...":       (s) => `"${s}" — say less. What's your availability?`,
  "Best spontaneous thing I've done...": (s) => `"${s}" — that's a strong opener of your own. How do I top it?`,
};

const GENERIC = [
  (s) => `You wrote "${s}" and I have so many follow-up questions.`,
  (s) => `Settle something for me: is "${s}" a personality trait or a lifestyle?`,
  (s) => `"${s}" — finally, someone said it.`,
];

const FROM_INTEREST = [
  (i) => `Important question about ${i}: how did you get into it?`,
  (i) => `Hot take incoming about ${i}. Ready?`,
  (i) => `${i[0].toUpperCase() + i.slice(1)} — what's the one thing everyone gets wrong about it?`,
];

/**
 * Three openers for messaging the card holder.
 * @param {object} profile  card ({ name, prompts, interests, hobbies })
 * @param {string} seed     stable seed (the application id)
 */
export function generateOpeners(profile, seed = "x", count = 3) {
  const rnd = seededRandom(seed);
  const candidates = [];

  for (const { prompt, answer } of profile?.prompts || []) {
    const s = snippet(answer);
    if (!s) continue;
    const tpl = BY_PROMPT[prompt] || GENERIC[Math.floor(rnd() * GENERIC.length)];
    candidates.push(tpl(s));
  }
  for (const i of [...(profile?.interests || []), ...(profile?.hobbies || [])]) {
    candidates.push(FROM_INTEREST[Math.floor(rnd() * FROM_INTEREST.length)](String(i).toLowerCase()));
  }
  if (!candidates.length) {
    const name = profile?.name?.split(" ")[0] || "there";
    candidates.push(`Hi ${name} — I'm the one who scanned your card. Thanks for letting me in.`);
  }

  // Seeded shuffle, prompt-based lines first (they're the most personal).
  const promptLines = candidates.slice(0, (profile?.prompts || []).filter((p) => snippet(p.answer)).length);
  const rest = candidates.slice(promptLines.length);
  const shuffle = (a) => a.map((v) => [rnd(), v]).sort((x, y) => x[0] - y[0]).map(([, v]) => v);
  return [...new Set([...shuffle(promptLines), ...shuffle(rest)])].slice(0, count);
}
