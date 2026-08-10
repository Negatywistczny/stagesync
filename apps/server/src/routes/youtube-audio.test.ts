import { EventEmitter } from "node:events";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import express from "express";

const spawnHooks = vi.hoisted(() => ({
  impl: null as null | ((cmd: string, args: string[]) => unknown),
}));

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawn: ((cmd: string, args: string[], ...rest: unknown[]) => {
      if (spawnHooks.impl) return spawnHooks.impl(cmd, args) as never;
      return (actual.spawn as (...a: unknown[]) => unknown)(cmd, args, ...rest);
    }) as typeof actual.spawn,
  };
});

import { NotFoundError } from "../storage/index.js";
import {
  createYoutubeAudioRouter,
  mountSessionYoutubeRoutes,
  resetYtDlpAvailabilityCacheForTests,
  sessionYoutubeJobsForTests,
  ytDlpResolver,
  youtubeAudioJobsForTests,
} from "./youtube-audio.js";

function mockSpawnProcess(opts: {
  code?: number | null;
  stdoutChunks?: string[];
  stderrChunks?: string[];
}): ReturnType<typeof EventEmitter> & {
  stdout: EventEmitter;
  stderr: EventEmitter;
  killed: boolean;
  kill: ReturnType<typeof vi.fn>;
} {
  const proc = new EventEmitter() as ReturnType<typeof EventEmitter> & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    killed: boolean;
    kill: ReturnType<typeof vi.fn>;
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.killed = false;
  proc.kill = vi.fn(() => {
    proc.killed = true;
  });
  queueMicrotask(() => {
    for (const chunk of opts.stdoutChunks ?? []) {
      proc.stdout.emit("data", Buffer.from(chunk));
    }
    for (const chunk of opts.stderrChunks ?? []) {
      proc.stderr.emit("data", Buffer.from(chunk));
    }
    proc.emit("close", opts.code ?? 0);
  });
  return proc;
}

describe("youtube-audio router", () => {
  beforeEach(() => {
    youtubeAudioJobsForTests.clear();
    sessionYoutubeJobsForTests.clear();
    resetYtDlpAvailabilityCacheForTests();
    spawnHooks.impl = null;
  });

  afterEach(() => {
    spawnHooks.impl = null;
  });

  it("rejects invalid video id", async () => {
    const stores = {
      getProject: vi.fn(async () => ({ id: "p1" })),
      paths: { dataDir: process.cwd() },
    };
    const app = express();
    app.use(express.json());
    app.use(
      "/api/projects/:id/assets",
      createYoutubeAudioRouter(stores as never),
    );
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
    app.use(
      "/api/projects/:id/assets",
      createYoutubeAudioRouter(stores as never),
    );
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

  it("GET from-youtube job returns 404 for unknown id", async () => {
    const stores = {
      getProject: vi.fn(async () => ({ id: "p1" })),
      paths: { dataDir: process.cwd() },
    };
    const app = express();
    app.use(express.json());
    app.use(
      "/api/projects/:id/assets",
      createYoutubeAudioRouter(stores as never),
    );
    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/projects/p1/assets/from-youtube/missing-job`,
      );
      expect(res.status).toBe(404);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("GET session youtube job returns seeded status", async () => {
    const { createImportRouter } = await import("./import.js");
    const app = express();
    app.use(express.json());
    app.use("/api/import", createImportRouter());
    sessionYoutubeJobsForTests.set("job-1", {
      id: "job-1",
      videoId: "dQw4w9WgXcQ",
      status: "downloading",
      progress: 42,
      createdAt: Date.now(),
    });
    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/import/audio/youtube/job-1`,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        jobId: string;
        status: string;
        progress: number;
        ready: boolean;
      };
      expect(body).toMatchObject({
        jobId: "job-1",
        status: "downloading",
        progress: 42,
        ready: false,
      });
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("GET session youtube file returns 404 when not ready", async () => {
    const { Router } = await import("express");
    const app = express();
    const router = Router();
    mountSessionYoutubeRoutes(router);
    app.use("/api/import", router);
    sessionYoutubeJobsForTests.set("job-2", {
      id: "job-2",
      videoId: "dQw4w9WgXcQ",
      status: "pending",
      progress: 0,
      createdAt: Date.now(),
    });
    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/import/audio/youtube/job-2/file`,
      );
      expect(res.status).toBe(404);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("GET session youtube job reports ready when done with bytes", async () => {
    const { Router } = await import("express");
    const app = express();
    const router = Router();
    mountSessionYoutubeRoutes(router);
    app.use("/api/import", router);
    const audio = Buffer.from("fake-mp3-bytes");
    sessionYoutubeJobsForTests.set("job-done", {
      id: "job-done",
      videoId: "dQw4w9WgXcQ",
      status: "done",
      progress: 100,
      bytes: audio,
      createdAt: Date.now(),
    });
    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;
    try {
      const statusRes = await fetch(
        `http://127.0.0.1:${port}/api/import/audio/youtube/job-done`,
      );
      expect(statusRes.status).toBe(200);
      await expect(statusRes.json()).resolves.toMatchObject({
        jobId: "job-done",
        status: "done",
        progress: 100,
        ready: true,
      });

      const fileRes = await fetch(
        `http://127.0.0.1:${port}/api/import/audio/youtube/job-done/file`,
      );
      expect(fileRes.status).toBe(200);
      expect(fileRes.headers.get("content-type")).toMatch(/audio\/mpeg/);
      const body = Buffer.from(await fileRes.arrayBuffer());
      expect(body.equals(audio)).toBe(true);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("POST from-youtube returns 404 when project missing", async () => {
    const stores = {
      getProject: vi.fn(async () => {
        throw new NotFoundError("Projekt nie znaleziony");
      }),
      paths: { dataDir: process.cwd() },
    };
    const app = express();
    app.use(express.json());
    app.use(
      "/api/projects/:id/assets",
      createYoutubeAudioRouter(stores as never),
    );
    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/projects/missing/assets/from-youtube`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: "dQw4w9WgXcQ" }),
        },
      );
      expect(res.status).toBe(404);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("GET from-youtube returns seeded job status", async () => {
    const stores = {
      getProject: vi.fn(async () => ({ id: "p1" })),
      paths: { dataDir: process.cwd() },
    };
    youtubeAudioJobsForTests.set("proj-job", {
      id: "proj-job",
      projectId: "p1",
      videoId: "dQw4w9WgXcQ",
      status: "done",
      progress: 100,
      assetId: "asset-1",
      message: "dQw4w9WgXcQ.mp3",
    });
    const app = express();
    app.use(express.json());
    app.use(
      "/api/projects/:id/assets",
      createYoutubeAudioRouter(stores as never),
    );
    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/projects/p1/assets/from-youtube/proj-job`,
      );
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toMatchObject({
        jobId: "proj-job",
        status: "done",
        assetId: "asset-1",
        progress: 100,
      });
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("POST from-youtube records download failure on job", async () => {
    const resolveSpy = vi
      .spyOn(ytDlpResolver, "resolve")
      .mockResolvedValue("/nonexistent-yt-dlp-for-tests");
    spawnHooks.impl = () =>
      mockSpawnProcess({
        code: 1,
        stderrChunks: ["ERROR: mock download failure"],
      });
    // Prevent ensureBundledYtDlp from hitting the network on fallback.
    const realFetch = globalThis.fetch.bind(globalThis);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.includes("github.com") || /yt-dlp/i.test(url)) {
          return new Response(null, { status: 503 });
        }
        return realFetch(input as RequestInfo | URL, init as RequestInit);
      });

    const stores = {
      getProject: vi.fn(async () => ({ id: "p1" })),
      paths: { dataDir: process.cwd() },
      addProjectAsset: vi.fn(),
    };
    const app = express();
    app.use(express.json());
    app.use(
      "/api/projects/:id/assets",
      createYoutubeAudioRouter(stores as never),
    );
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
      expect(res.status).toBe(202);
      const { jobId } = (await res.json()) as { jobId: string };

      let job = youtubeAudioJobsForTests.get(jobId);
      for (let i = 0; i < 40 && job?.status !== "error"; i++) {
        await new Promise((r) => setTimeout(r, 25));
        job = youtubeAudioJobsForTests.get(jobId);
      }
      expect(job?.status).toBe("error");
      expect(job?.error).toMatch(/yt-dlp|mock download/i);
    } finally {
      spawnHooks.impl = null;
      fetchSpy.mockRestore();
      resolveSpy.mockRestore();
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("session GET returns 404 for unknown job", async () => {
    const { Router } = await import("express");
    const app = express();
    const router = Router();
    mountSessionYoutubeRoutes(router);
    app.use("/api/import", router);
    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/import/audio/youtube/missing`,
      );
      expect(res.status).toBe(404);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("prunes expired session jobs", async () => {
    const { Router } = await import("express");
    const app = express();
    const router = Router();
    mountSessionYoutubeRoutes(router);
    app.use("/api/import", router);
    sessionYoutubeJobsForTests.set("old-job", {
      id: "old-job",
      videoId: "dQw4w9WgXcQ",
      status: "done",
      progress: 100,
      bytes: Buffer.from("x"),
      createdAt: Date.now() - 31 * 60 * 1000,
    });
    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/import/audio/youtube/old-job`,
      );
      expect(res.status).toBe(404);
      expect(sessionYoutubeJobsForTests.has("old-job")).toBe(false);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
