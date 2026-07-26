import { describe, expect, it, vi } from "vitest";
import {
  fetchAndroidLatestManifest,
  isSemverNewer,
} from "./androidLatest.js";

describe("isSemverNewer", () => {
  it("detects patch bumps", () => {
    expect(isSemverNewer("5.2.7", "5.2.5")).toBe(true);
    expect(isSemverNewer("5.2.5", "5.2.7")).toBe(false);
    expect(isSemverNewer("5.2.7", "5.2.7")).toBe(false);
  });
});

describe("fetchAndroidLatestManifest", () => {
  it("parses console/performer URLs", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        version: "5.2.7",
        consoleUrl: "https://example.com/c.apk",
        performerUrl: "https://example.com/p.apk",
      }),
    );
    await expect(fetchAndroidLatestManifest(fetchImpl)).resolves.toEqual({
      version: "5.2.7",
      consoleUrl: "https://example.com/c.apk",
      performerUrl: "https://example.com/p.apk",
    });
  });

  it("returns null on HTTP error", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 404 }));
    await expect(fetchAndroidLatestManifest(fetchImpl)).resolves.toBeNull();
  });
});
