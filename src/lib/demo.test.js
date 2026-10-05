// @vitest-environment jsdom
// The demo store mirrors the SQL contract — these tests pin the same privacy
// rules that scripts/live_test.py checks against a real Supabase project.
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as demo from "./demo.js";

const card = (over = {}) => ({
  id: "CARD0001", type: "serious", name: "Test Owner", age: 30, location: "Davao",
  bio: "hi", interests: ["chess"], hobbies: [], lookingFor: "x",
  prompts: [{ prompt: "I get way too excited about...", answer: "Spreadsheets. Big ones." }],
  socials: { instagram: "@owner" }, status: "active", settings: { showLocation: true }, ...over,
});

beforeEach(async () => {
  localStorage.clear();
  demo.resetDemo();
  await demo.signIn("google");
});

describe("demo store", () => {
  it("never puts socials in the public profile", async () => {
    await demo.saveProfile(card());
    const p = await demo.getPublicProfile("CARD0001");
    expect(p.name).toBe("Test Owner");
    expect(p).not.toHaveProperty("socials");
    expect(p.isMine).toBe(true);
  });

  it("seeds a new card with unique applicants and two weeks of views", async () => {
    await demo.saveProfile(card());
    const apps = await demo.getApplications("CARD0001");
    expect(apps).toHaveLength(3);
    expect(new Set(apps.map((a) => a.name)).size).toBe(3);
    expect((await demo.getEventStats("CARD0001")).views).toBeGreaterThan(0);
  });

  it("one card per type: saving another serious card replaces it", async () => {
    await demo.saveProfile(card());
    await demo.saveProfile(card({ id: "CARD0002" }));
    expect((await demo.getMyProfiles()).map((p) => p.id)).toEqual(["CARD0002"]);
  });

  it("reveals socials only after accept", async () => {
    await demo.saveProfile(card());
    const app = await demo.submitApplication("CARD0001", { note: "hello" });
    expect(await demo.revealSocials("CARD0001", demo.STRANGER)).toBeNull();
    await demo.setApplicationStatus(app.id, "declined");
    expect(await demo.revealSocials("CARD0001", demo.STRANGER)).toBeNull();
    await demo.setApplicationStatus(app.id, "accepted");
    expect(await demo.revealSocials("CARD0001", demo.STRANGER)).toEqual({ instagram: "@owner" });
  });

  it("the owner can always see their own socials", async () => {
    await demo.saveProfile(card());
    expect(await demo.revealSocials("CARD0001", demo.OWNER)).toEqual({ instagram: "@owner" });
  });

  it("refuses applications to paused cards", async () => {
    await demo.saveProfile(card({ status: "paused" }));
    await expect(demo.submitApplication("CARD0001", {})).rejects.toThrow(/paused/);
  });

  it("applying twice returns the same application", async () => {
    await demo.saveProfile(card());
    const a = await demo.submitApplication("CARD0001", {});
    const b = await demo.submitApplication("CARD0001", {});
    expect(b.id).toBe(a.id);
  });

  it("sample owners accept after the pause, even across reloads", async () => {
    vi.useFakeTimers();
    const app = await demo.submitApplication("DEMO", { note: "hi" });
    expect((await demo.getApplication(app.id)).status).toBe("pending");
    vi.setSystemTime(Date.now() + demo.SAMPLE_ACCEPT_MS + 1);
    expect((await demo.getApplication(app.id)).status).toBe("accepted");
    expect(await demo.revealSocials("DEMO", demo.STRANGER)).toMatchObject({ instagram: "@alexmorgan.film" });
    vi.useRealTimers();
  });

  it("simulateScan logs a view and usually an application", async () => {
    await demo.saveProfile(card());
    const before = (await demo.getEventStats("CARD0001")).views;
    for (let i = 0; i < 10; i++) await demo.simulateScan("CARD0001");
    const after = await demo.getEventStats("CARD0001");
    expect(after.views).toBe(before + 10);
    expect((await demo.getApplications("CARD0001")).length).toBeGreaterThan(3);
  });

  it("persists to localStorage", async () => {
    await demo.saveProfile(card());
    expect(JSON.parse(localStorage.getItem("datecard.demo.v1")).profiles[0].id).toBe("CARD0001");
  });
});
