import { describe, expect, it } from "vitest";
import { LEGENDARY_WORKING_TITLES, getWorkingTitle } from "./working-titles.js";

describe("LEGENDARY_WORKING_TITLES easter egg generator", () => {
  it("contains iconic music history & studio working titles", () => {
    expect(LEGENDARY_WORKING_TITLES).toContain("Scrambled Eggs");
    expect(LEGENDARY_WORKING_TITLES).toContain(
      "Untitled Jam in Dm (The Saddest of All Keys)",
    );
    expect(LEGENDARY_WORKING_TITLES).toContain("These Go to Eleven");
    expect(LEGENDARY_WORKING_TITLES.length).toBeGreaterThanOrEqual(8);
  });

  it("returns a deterministic title when provided a string seed", () => {
    const titleA1 = getWorkingTitle("proj-12345");
    const titleA2 = getWorkingTitle("proj-12345");
    expect(titleA1).toBe(titleA2);
    expect(LEGENDARY_WORKING_TITLES).toContain(titleA1);
  });

  it("returns a deterministic title when provided a numeric seed", () => {
    const title42_1 = getWorkingTitle(42);
    const title42_2 = getWorkingTitle(42);
    expect(title42_1).toBe(title42_2);
    expect(LEGENDARY_WORKING_TITLES).toContain(title42_1);
  });

  it("returns a valid title without arguments", () => {
    const randomTitle = getWorkingTitle();
    expect(LEGENDARY_WORKING_TITLES).toContain(randomTitle);
  });
});
