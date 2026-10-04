import { describe, it, expect } from "vitest";
import { generateId, canShowLocation, timeAgo, cardStrength, statsFrom, seededRandom } from "./util.js";
import { CARD_TEMPLATES, qrColors } from "./constants.js";

describe("generateId", () => {
  it("is 8 readable characters, never 0/O/1/I", () => {
    for (let i = 0; i < 500; i++) expect(generateId()).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });
  it("doesn't repeat", () => {
    const ids = new Set(Array.from({ length: 2000 }, () => generateId()));
    expect(ids.size).toBe(2000);
  });
});

describe("canShowLocation (SPEC §5.4)", () => {
  it("never shows a city on casual cards", () => {
    expect(canShowLocation({ type: "casual", settings: { showLocation: true } })).toBe(false);
  });
  it("defaults on for serious and friendship", () => {
    expect(canShowLocation({ type: "serious" })).toBe(true);
    expect(canShowLocation({ type: "friendship", settings: {} })).toBe(true);
  });
  it("honours the toggle", () => {
    expect(canShowLocation({ type: "serious", settings: { showLocation: false } })).toBe(false);
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-10-04T12:00:00Z").getTime();
  it.each([
    ["2026-10-04T11:59:50Z", "just now"],
    ["2026-10-04T11:55:00Z", "5 min ago"],
    ["2026-10-04T09:00:00Z", "3 hours ago"],
    ["2026-10-03T10:00:00Z", "Yesterday"],
    ["2026-09-30T12:00:00Z", "4 days ago"],
  ])("%s → %s", (iso, want) => expect(timeAgo(iso, now)).toBe(want));
  it("passes through legacy strings", () => expect(timeAgo("2 hours ago", now)).toBe("2 hours ago"));
});

describe("cardStrength", () => {
  it("starts low and suggests the next step", () => {
    const s = cardStrength({ name: "A" });
    expect(s.score).toBeLessThan(20);
    expect(s.next).toMatch(/photo/i);
  });
  it("hits 100 for a complete card", () => {
    const s = cardStrength({
      name: "A", photo_url: "x", bio: "x".repeat(80), lookingFor: "y",
      interests: ["a", "b", "c"], socials: { instagram: "@a" },
      prompts: [1, 2, 3].map((i) => ({ prompt: `p${i}`, answer: "yes" })),
    });
    expect(s).toEqual({ score: 100, next: null });
  });
});

describe("statsFrom", () => {
  it("counts kinds and buckets views into 14 days", () => {
    const now = new Date("2026-10-04T12:00:00Z").getTime();
    const day = (d) => new Date(now - d * 864e5 - 1000).toISOString();
    const s = statsFrom([
      { kind: "view", at: day(0) }, { kind: "view", at: day(0) }, { kind: "view", created_at: day(13) },
      { kind: "view", at: day(20) }, { kind: "apply", at: day(0) }, { kind: "accept", at: day(0) },
    ], now);
    expect(s).toMatchObject({ views: 4, applies: 1, accepts: 1, reports: 0 });
    expect(s.daily[13]).toBe(2);
    expect(s.daily[0]).toBe(1);
    expect(s.daily.reduce((a, b) => a + b)).toBe(3);
  });
});

describe("seededRandom", () => {
  it("is deterministic per seed", () => {
    const a = seededRandom("abc"), b = seededRandom("abc"), c = seededRandom("abd");
    const xs = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(xs);
    expect(c()).not.toBe(xs[0]);
  });
});

describe("qrColors", () => {
  const lum = (hex) => {
    const [r, g, b] = hex.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  it.each(CARD_TEMPLATES.map((t) => [t.id, t]))("%s: dark modules on a light ground (scannable everywhere)", (_, tpl) => {
    const { fg, bg } = qrColors(tpl);
    expect(lum(fg)).toBeLessThan(lum(bg));
    expect(lum(bg) - lum(fg)).toBeGreaterThan(0.4);
  });
});
