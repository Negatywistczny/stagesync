import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

vi.mock("../system/env-settings.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../system/env-settings.js")>();
  return {
    ...actual,
    writeManagedSettings: vi.fn(() => ({
      values: {} as never,
      envExists: false,
    })),
  };
});

const { createApp } = await import("../app.js");

describe("Safety Net API", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    vi.unstubAllEnvs();
    await Promise.all(
      dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
    );
  });

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

  it("reports spare MIDI mute and promote flips to master", async () => {
    vi.stubEnv("STAGESYNC_SAFETY_ROLE", "spare");
    const dataDir = await mkdtemp(join(tmpdir(), "ss-safety-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    try {
      const status = await fetch(`${baseUrl}/api/system/safety-net`);
      expect(status.status).toBe(200);
      expect(await status.json()).toEqual({
        role: "spare",
        midiOutAllowed: false,
      });

      const promote = await fetch(`${baseUrl}/api/system/promote`, {
        method: "POST",
      });
      expect(promote.status).toBe(200);
      expect(await promote.json()).toEqual({
        ok: true,
        role: "master",
        midiOutAllowed: true,
        transportPaused: false,
      });

      const after = await fetch(`${baseUrl}/api/system/safety-net`);
      expect(await after.json()).toEqual({
        role: "master",
        midiOutAllowed: true,
      });
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
  it("defaults to master when safety role unset", async () => {
    vi.stubEnv("STAGESYNC_SAFETY_ROLE", "");
    const dataDir = await mkdtemp(join(tmpdir(), "ss-safety-master-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    try {
      const status = await fetch(`${baseUrl}/api/system/safety-net`);
      expect(status.status).toBe(200);
      expect(await status.json()).toEqual({
        role: "master",
        midiOutAllowed: true,
      });

      const promote = await fetch(`${baseUrl}/api/system/promote`, {
        method: "POST",
      });
      expect(promote.status).toBe(200);
      expect(await promote.json()).toEqual({
        ok: true,
        role: "master",
        midiOutAllowed: true,
        transportPaused: false,
      });
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("pauses PLAYING transport on promote and keeps playhead", async () => {
    vi.stubEnv("STAGESYNC_SAFETY_ROLE", "spare");
    const dataDir = await mkdtemp(join(tmpdir(), "ss-safety-pause-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    try {
      const play = await fetch(`${baseUrl}/api/transport/play`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bpm: 120 }),
      });
      expect(play.status).toBe(200);
      const before = (await play.json()) as {
        playing: boolean;
        positionTicks: number;
      };
      expect(before.playing).toBe(true);

      await new Promise((r) => setTimeout(r, 80));

      const mid = await fetch(`${baseUrl}/api/transport`);
      const midState = (await mid.json()) as {
        playing: boolean;
        positionTicks: number;
      };
      expect(midState.playing).toBe(true);
      expect(midState.positionTicks).toBeGreaterThan(0);

      const promote = await fetch(`${baseUrl}/api/system/promote`, {
        method: "POST",
      });
      expect(promote.status).toBe(200);
      const body = (await promote.json()) as {
        ok: boolean;
        role: string;
        transportPaused: boolean;
      };
      expect(body).toMatchObject({
        ok: true,
        role: "master",
        transportPaused: true,
      });

      const after = await fetch(`${baseUrl}/api/transport`);
      const afterState = (await after.json()) as {
        playing: boolean;
        positionTicks: number;
      };
      expect(afterState.playing).toBe(false);
      expect(afterState.positionTicks).toBeGreaterThanOrEqual(
        midState.positionTicks,
      );
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
