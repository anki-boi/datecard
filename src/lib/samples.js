// Sample cards and sample people for DEMO_MODE. Read-only showcase content.

export const SAMPLE_CARDS = [
  {
    id: "DEMO", type: "serious", name: "Alex Morgan", age: 28, location: "New York",
    photo_url: null, avatar: "🌿",
    bio: "Coffee-fuelled creative. Weekends are bookshops or hiking trails, rarely both, never neither. Convinced a good playlist fixes most things and a bad one ruins dinner.",
    interests: ["Travel", "Film", "Coffee", "Architecture", "Jazz"],
    hobbies: ["Photography", "Bouldering", "Cooking"],
    lookingFor: "Something real. Someone curious about the world.",
    prompts: [
      { prompt: "I get way too excited about...", answer: "Finding a perfect hole-in-the-wall restaurant nobody knows about. Hand-written menu, one person running everything." },
      { prompt: "A perfect Sunday looks like...", answer: "Farmers market, long brunch, obscure film at an independent cinema, then cooking whatever looked good at the market." },
      { prompt: "You'll know I like you when...", answer: "I send voice notes instead of texts. It means I trust you enough to sound like a real person." },
    ],
    socials: { instagram: "@alexmorgan.film", twitter: "", facebook: "", tiktok: "", linkedin: "" },
    status: "active", settings: { showLocation: true }, sample: true,
  },
  {
    id: "DEMORAE", type: "casual", name: "Rae", age: 31, location: "Manila",
    photo_url: null, avatar: "🌙",
    bio: "Night owl, karaoke menace, will absolutely judge your go-to song. Here for good conversation and better chaos. Honest to a fault — I'll tell you what I want and I expect the same.",
    interests: ["Karaoke", "Night markets", "Mezcal", "Vinyl"],
    hobbies: ["DJing (badly)", "Muay Thai"],
    lookingFor: "Good times, clear terms, zero drama.",
    prompts: [
      { prompt: "My idea of a good time is...", answer: "A 2am street-food run after a set that went way too long. Bonus points if you know a stall I don't." },
      { prompt: "I'm upfront about...", answer: "Everything. Ask me anything and you'll get the real answer, so only ask if you want it." },
      { prompt: "Dealbreaker for me is...", answer: "Being rude to the server. Instant and permanent." },
    ],
    socials: { instagram: "@rae.after.dark", twitter: "", facebook: "", tiktok: "@raesings", linkedin: "" },
    status: "active", settings: { showLocation: false }, sample: true,
  },
  {
    id: "DEMOMIKO", type: "friendship", name: "Miko Santos", age: 26, location: "Cagayan de Oro",
    photo_url: null, avatar: "🎯",
    bio: "Just moved here for work and my social life is currently one barista who knows my order. Into board games, trail runs, and over-planning group trips that never happen. Let's make one happen.",
    interests: ["Board games", "Trail running", "Anime", "Coffee"],
    hobbies: ["Catan", "Film photography", "Baking"],
    lookingFor: "Friends to explore the city with — and a weekly game night crew.",
    prompts: [
      { prompt: "I'm new here and need...", answer: "Someone to show me where the locals actually eat. Not the place on every list." },
      { prompt: "I'm the friend who always...", answer: "Brings snacks nobody asked for and everybody eats." },
      { prompt: "Best way to spend a Tuesday night...", answer: "Board games, cheap pizza, and one too many rematches of Catan." },
    ],
    socials: { instagram: "@miko.rolls", twitter: "@mikosantos", facebook: "", tiktok: "", linkedin: "" },
    status: "active", settings: { showLocation: true }, sample: true,
  },
];

export const sampleCard = (id) => SAMPLE_CARDS.find((c) => c.id === id) || null;

/** Fake applicants for "Simulate a scan" — names, emojis, platforms, and note templates. */
export const SAMPLE_PEOPLE = [
  ["Jordan Lee", "🌿", "instagram", "@jordanlee"], ["Sam Rivera", "🎸", "twitter", "@samrivera"],
  ["Alex Kim", "📚", "facebook", "Alex Kim"], ["Riley Chen", "🌙", "instagram", "@rileyc"],
  ["Morgan Tan", "🎯", "tiktok", "@morgantan"], ["Drew Patel", "🎮", "twitter", "@drewp"],
  ["Casey Reyes", "🌊", "instagram", "@casey.reyes"], ["Noa Cruz", "🍜", "instagram", "@noaeats"],
  ["Jules Ortega", "🎨", "tiktok", "@julesdraws"], ["Kai Navarro", "🏃", "twitter", "@kairuns"],
  ["Bea Lim", "🎧", "instagram", "@bea.loops"], ["Theo Park", "🧗", "instagram", "@theoclimbs"],
  ["Ines Duarte", "🌻", "facebook", "Ines Duarte"], ["Rafa Mendoza", "☕", "instagram", "@rafa.brews"],
  ["Lux Tan", "🪩", "tiktok", "@luxlux"], ["Pia Gomez", "📷", "instagram", "@pia.frames"],
];

export const NOTE_TEMPLATES = [
  (s) => `Your "${s}" line is the reason I'm applying.`,
  (s) => `"${s}" — okay, we need to talk about this.`,
  (s) => `I read "${s}" and laughed out loud on the train.`,
  () => `We met at the coffee place by the window. You dropped your card. (Kidding. You handed it to me. Smooth.)`,
  () => `Scanned this off the back of your phone case. Bold move. It worked.`,
  () => `I don't usually do this, but your card was too good not to.`,
  () => "",
];
