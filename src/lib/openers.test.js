import { describe, it, expect } from "vitest";
import { snippet, generateOpeners } from "./openers.js";
import { SAMPLE_CARDS } from "./samples.js";

describe("snippet", () => {
  it("keeps the first sentence and trims long ones", () => {
    expect(snippet("Finding a perfect hole-in-the-wall restaurant nobody knows about. Hand-written menu."))
      .toBe("finding a perfect hole-in-the-wall restaurant nobody knows about");
    expect(snippet("one two three four five six seven eight nine ten eleven", 4)).toBe("one two three four…");
  });
  it("keeps I and proper nouns capitalised", () => {
    expect(snippet("I send voice notes.")).toBe("I send voice notes");
    expect(snippet("New York in the fall")).toBe("New York in the fall");
  });
  it("handles empty answers", () => expect(snippet("   ")).toBe(""));
});

describe("generateOpeners", () => {
  const alex = SAMPLE_CARDS[0];
  it("returns three distinct lines", () => {
    const o = generateOpeners(alex, "APP1");
    expect(o).toHaveLength(3);
    expect(new Set(o).size).toBe(3);
  });
  it("is stable per application and varies across applications", () => {
    expect(generateOpeners(alex, "APP1")).toEqual(generateOpeners(alex, "APP1"));
    const variants = new Set(["A", "B", "C", "D", "E", "F"].map((s) => generateOpeners(alex, s).join("|")));
    expect(variants.size).toBeGreaterThan(1);
  });
  it("quotes the card's own answers", () => {
    expect(generateOpeners(alex, "x").join(" ")).toMatch(/voice notes|Sunday|hole-in-the-wall/);
  });
  it("falls back to a friendly hello for an empty card", () => {
    expect(generateOpeners({ name: "Sam Lee" }, "x")).toEqual(["Hi Sam — I'm the one who scanned your card. Thanks for letting me in."]);
  });
  it("works for every sample card", () => {
    for (const c of SAMPLE_CARDS) expect(generateOpeners(c, c.id).length).toBe(3);
  });
});
