import { createServer, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ProjectSchema,
  PutProjectBodySchema,
  TransportStateSchema,
  transportHomeTicks,
  type Project,
} from "@stagesync/shared";
import { createApp } from "./app.js";
import { createTransportEngine } from "./transport/engine.js";

function putBody(project: Project) {
  const { id, ...body } = project;
  void id;
  return PutProjectBodySchema.parse(body);
}

describe("setlist auto-advance", () => {
  let dataDir: string;
  let server: Server;
  let baseUrl: string;
  let nowMs: number;
  let disposeTransport: () => void;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ss-autoadv-"));
    nowMs = 0;
    const transport = createTransportEngine({
      now: () => nowMs,
      tickIntervalMs: 20,
    });
    disposeTransport = () => transport.dispose();
    const { app } = createApp({ dataDir, transport });
    server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    disposeTransport();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await rm(dataDir, { recursive: true, force: true });
  });

  it("loads next song and stops at home when past end", async () => {
    const create = async (name: string) =>
      ProjectSchema.parse(
        await (
          await fetch(`${baseUrl}/api/projects`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name }),
          })
        ).json(),
      );

    const a = await create("Song A");
    const b = await create("Song B");

    const shortA: Project = {
      ...a,
      forma: {
        clips: [
          ...a.forma.clips.filter((c) => c.kind === "countdown"),
          {
            id: "forma-short",
            name: "Short",
            kind: "section",
            startTicks: 0,
            lengthTicks: 960,
          },
        ],
      },
    };
    await fetch(`${baseUrl}/api/projects/${a.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(putBody(shortA)),
    });

    await fetch(`${baseUrl}/api/setlist`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: true, projectIds: [a.id, b.id] }),
    });
    await fetch(`${baseUrl}/api/setlist/auto-advance`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });

    await fetch(`${baseUrl}/api/transport/load`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: a.id }),
    });
    await fetch(`${baseUrl}/api/transport/seek`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ positionTicks: 900 }),
    });
    await fetch(`${baseUrl}/api/transport/play`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: a.id }),
    });

    // ~1s @ 120 BPM ≈ 1920 ticks — past end 960
    nowMs += 1000;

    // Poll: transport tick (20ms) + async setlist/load/stop can lag under suite load.
    let state = TransportStateSchema.parse(
      await (await fetch(`${baseUrl}/api/transport`)).json(),
    );
    const deadline = Date.now() + 2000;
    while (
      (state.playing || state.activeProjectId !== b.id) &&
      Date.now() < deadline
    ) {
      await new Promise((r) => setTimeout(r, 40));
      state = TransportStateSchema.parse(
        await (await fetch(`${baseUrl}/api/transport`)).json(),
      );
    }

    expect(state.playing).toBe(false);
    expect(state.activeProjectId).toBe(b.id);
    expect(state.positionTicks).toBe(transportHomeTicks(b));
  });
});
