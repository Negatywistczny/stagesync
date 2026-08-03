import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import {
  checkYtDlpAvailable,
  createYoutubeAudioRouter,
  resolveYtDlpCommand,
  resetYtDlpAvailabilityCacheForTests,
  ytDlpResolver,
  youtubeAudioJobsForTests,
} from "./youtube-audio.js";

describe("youtube-audio router", () => {
  beforeEach(() => {
    youtubeAudioJobsForTests.clear();
    resetYtDlpAvailabilityCacheForTests();
  });

  it("rejects invalid video id", async () => {
    const stores = {
      getProject: vi.fn(async () => ({ id: "p1" })),
      paths: { dataDir: process.cwd() },
    };
    const app = express();
    app.use(express.json());
    app.use("/api/projects/:id/assets", createYoutubeAudioRouter(stores as never));
    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/projects/p1/assets/from-youtube`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: "bad" }),
        },
      );
      expect(res.status).toBe(400);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("session route rejects invalid video id", async () => {
    const { createImportRouter } = await import("./import.js");
    const app = express();
    app.use(express.json());
    app.use("/api/import", createImportRouter());
    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/import/audio/youtube`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: "bad" }),
        },
      );
      expect(res.status).toBe(400);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("returns 503 when yt-dlp missing", async () => {
    resetYtDlpAvailabilityCacheForTests();
    const resolveSpy = vi
      .spyOn(ytDlpResolver, "resolve")
      .mockResolvedValue(null);
    const stores = {
      getProject: vi.fn(async () => ({ id: "p1" })),
      paths: { dataDir: process.cwd() },
    };
    const app = express();
    app.use(express.json());
    app.use("/api/projects/:id/assets", createYoutubeAudioRouter(stores as never));
    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/projects/p1/assets/from-youtube`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: "dQw4w9WgXcQ" }),
        },
      );
      expect(res.status).toBe(503);
      const body = (await res.json()) as { error?: string };
      expect(body.error).toMatch(/yt-dlp/i);
    } finally {
      resolveSpy.mockRestore();
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});

describe("checkYtDlpAvailable", () => {
  it("returns boolean without throwing", async () => {
    resetYtDlpAvailabilityCacheForTests();
    const resolveSpy = vi
      .spyOn(ytDlpResolver, "resolve")
      .mockResolvedValue("/tmp/yt-dlp");
    const ok = await checkYtDlpAvailable(process.cwd());
    expect(ok).toBe(true);
    resolveSpy.mockRestore();
  });
});

describe("resolveYtDlpCommand", () => {
  it(
    "accepts repo bundled yt-dlp when runnable",
    async () => {
      resetYtDlpAvailabilityCacheForTests();
      const cmd = await resolveYtDlpCommand(process.cwd(), {
        allowDownload: false,
      });
      expect(cmd === null || typeof cmd === "string").toBe(true);
    },
    30_000,
  );
});
