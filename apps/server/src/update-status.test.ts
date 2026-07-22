import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLatestReleaseVersion, isSemverNewer } from "./routes/system.js";
import { createApp } from "./app.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.STAGESYNC_SHELL;
  delete process.env.STAGESYNC_GITHUB_TOKEN;
});

describe("isSemverNewer", () => {
  it("treats equal versions as not newer", () => {
    expect(isSemverNewer("5.0.0", "5.0.0")).toBe(false);
    expect(isSemverNewer("5.0.0-beta.2", "5.0.0-beta.2")).toBe(false);
  });

  it("does not treat an older prerelease as an update", () => {
    expect(isSemverNewer("5.0.0-beta.1", "5.0.0")).toBe(false);
    expect(isSemverNewer("5.0.0-alpha.13", "5.0.0-beta.2")).toBe(false);
  });

  it("detects newer patch and prerelease", () => {
    expect(isSemverNewer("5.0.1", "5.0.0")).toBe(true);
    expect(isSemverNewer("5.0.0", "5.0.0-beta.2")).toBe(true);
    expect(isSemverNewer("5.0.0-beta.3", "5.0.0-beta.2")).toBe(true);
  });
});

describe("fetchLatestReleaseVersion", () => {
  it("picks newest non-draft release including prereleases", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json([
        {
          tag_name: "v5.0.0-alpha.11",
          draft: false,
          prerelease: true,
          published_at: "2026-07-21T10:00:00Z",
        },
        {
          tag_name: "v5.0.0-alpha.13",
          draft: false,
          prerelease: true,
          published_at: "2026-07-21T19:00:00Z",
        },
        {
          tag_name: "v5.0.0-alpha.12-draft",
          draft: true,
          prerelease: true,
          published_at: "2026-07-21T20:00:00Z",
        },
      ]),
    );

    const result = await fetchLatestReleaseVersion(
      "tok",
      fetchImpl as unknown as typeof fetch,
      "all",
    );
    expect(result).toEqual({ latest: "5.0.0-alpha.13", error: null });
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("/releases?per_page=20");
  });

  it("explains private-repo 404 without token", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 404 }));
    const result = await fetchLatestReleaseVersion(undefined, fetchImpl as unknown as typeof fetch);
    expect(result.latest).toBeNull();
    expect(result.error).toMatch(/tokenu|prywatne/i);
  });

  it("reports network failure without claiming token missing", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    const result = await fetchLatestReleaseVersion("tok", fetchImpl as unknown as typeof fetch);
    expect(result.latest).toBeNull();
    expect(result.error).toMatch(/nieosiągalne|sieć|timeout/i);
    expect(result.error).not.toMatch(/token/i);
  });
});

describe("GET /api/system/update-status", () => {
  async function listen(
    dataDir: string,
  ): Promise<{ server: Server; baseUrl: string }> {
    const { app } = createApp({ dataDir });
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    return { server, baseUrl: `http://127.0.0.1:${port}` };
  }

  it("skips GitHub fetch in desktop sidecar shell", async () => {
    process.env.STAGESYNC_SHELL = "desktop";
    const realFetch = globalThis.fetch;
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("api.github.com")) {
        throw new Error("GitHub must not be contacted in desktop shell");
      }
      return realFetch(input, init);
    });
    vi.stubGlobal("fetch", fetchSpy);

    const dataDir = await mkdtemp(join(tmpdir(), "stagesync-update-"));
    const { server, baseUrl } = await listen(dataDir);
    try {
      const res = await realFetch(`${baseUrl}/api/system/update-status`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        current: string;
        latest: string | null;
        updateAvailable: boolean;
        error: string | null;
      };
      expect(body.latest).toBeNull();
      expect(body.updateAvailable).toBe(false);
      expect(body.error).toBeNull();
      expect(body.current.length).toBeGreaterThan(0);
      expect(
        fetchSpy.mock.calls.some((c) => String(c[0]).includes("api.github.com")),
      ).toBe(false);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
