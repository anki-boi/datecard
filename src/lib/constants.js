// The product's vocabulary: card types, prompt pools, socials, print templates.
// Shared by the UI, the AI builder, the opener generator and the demo store.

export const PROFILE_TYPES = [
  { id: "serious",    label: "Serious",        icon: "💍", tagline: "Looking for something real",   color: "#c9a84c", desc: "Long-term relationship, intentional dating. The version of you that's ready." },
  { id: "casual",     label: "Casual / Spicy", icon: "🔥", tagline: "No strings, all vibes",        color: "#e0533f", desc: "Hookups, situationships, fun. Keep it separate from everything else.", sensitive: true },
  { id: "friendship", label: "Friendship",     icon: "🤝", tagline: "Just looking for good people", color: "#52b788", desc: "New city, new chapter, want to expand your circle." },
];

export const typeOf = (id) => PROFILE_TYPES.find((t) => t.id === id) || PROFILE_TYPES[0];

export const PROMPTS_BY_TYPE = {
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

export const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram",   icon: "📸", placeholder: "@username",   link: (h) => `https://instagram.com/${h.replace(/^@/, "")}` },
  { id: "twitter",   label: "X / Twitter", icon: "🐦", placeholder: "@username",   link: (h) => `https://x.com/${h.replace(/^@/, "")}` },
  { id: "facebook",  label: "Facebook",    icon: "👤", placeholder: "Profile URL", link: (h) => (/^https?:/.test(h) ? h : null) },
  { id: "tiktok",    label: "TikTok",      icon: "🎵", placeholder: "@username",   link: (h) => `https://tiktok.com/@${h.replace(/^@/, "")}` },
  { id: "linkedin",  label: "LinkedIn",    icon: "💼", placeholder: "Profile URL", link: (h) => (/^https?:/.test(h) ? h : null) },
];

export const socialOf = (id) => SOCIAL_PLATFORMS.find((s) => s.id === id);

/** Real Supabase OAuth providers. (Supabase has no Instagram or TikTok provider.) */
export const AUTH_PROVIDERS = [
  { id: "google",   label: "Google",      icon: "🌐" },
  { id: "facebook", label: "Facebook",    icon: "👤" },
  { id: "twitter",  label: "X / Twitter", icon: "🐦" },
];

export const CARD_TEMPLATES = [
  { id: "classic", label: "Classic", premium: false, bg: "#0a0a0a",                                         text: "#e8d5a3", accent: "#c9a84c", border: "#2a2a2a" },
  { id: "cream",   label: "Cream",   premium: false, bg: "#e8dcc8",                                         text: "#3a2c28", accent: "#7a5a3e", border: "#c9b79c" },
  { id: "noir",    label: "Noir",    premium: true,  bg: "linear-gradient(135deg,#0d0d0d 0%,#1a1208 100%)", text: "#e8d5a3", accent: "#c9a84c", border: "#c9a84c" },
  { id: "minimal", label: "Minimal", premium: true,  bg: "#ffffff",                                         text: "#111111", accent: "#555555", border: "#dddddd" },
  { id: "bold",    label: "Bold",    premium: true,  bg: "#c9a84c",                                         text: "#0a0a0a", accent: "#0a0a0a", border: "transparent" },
  { id: "rose",    label: "Rose",    premium: true,  bg: "linear-gradient(160deg,#2a0e0b 0%,#1a0a08 100%)", text: "#f5d0c8", accent: "#e07a6a", border: "#5c1a14" },
];

export const templateOf = (id) => CARD_TEMPLATES.find((t) => t.id === id) || CARD_TEMPLATES[0];

/** Solid colour behind a template (gradients → their last stop), for QR codes and canvases. */
export function templateSolid(tpl) {
  if (!tpl.bg.startsWith("linear")) return tpl.bg;
  const stops = tpl.bg.match(/#[0-9a-f]{6}/gi);
  return stops ? stops[stops.length - 1] : "#0a0a0a";
}

const luminance = (hex) => {
  const [r, g, b] = hex.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * QR colours with normal polarity — dark modules on a light ground. Light-on-dark
 * ("inverted") codes look nicer but plenty of older Android scanners can't read
 * them, and a card nobody can scan is just a card. Dark designs get a light tile.
 */
export function qrColors(tpl) {
  const solid = templateSolid(tpl);
  if (luminance(solid) > 0.45) return { fg: luminance(tpl.accent) < 0.35 ? tpl.accent : tpl.text, bg: solid };
  return { fg: solid, bg: tpl.text };
}

export const EMPTY_SOCIALS = { instagram: "", twitter: "", facebook: "", tiktok: "", linkedin: "" };
