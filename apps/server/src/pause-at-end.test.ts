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
  type Project,
} from "@stagesync/shared";
import { createApp } from "./app.js";
import { createTransportEngine } from "./transport/engine.js";

function putBody(project: Project) {
  const { id, ...body } = project;
  void id;
  return PutProjectBodySchema.parse(body);
}

describe("pause at song end", () => {
  let dataDir: string;
  let server: Server;
  let baseUrl: string;
  let nowMs: number;
  let disposeTransport: () => void;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ss-pause-end-"));
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

  it("pauses and clamps to end when auto-advance is off", async () => {
    const created = ProjectSchema.parse(
      await (
        await fetch(`${baseUrl}/api/projects`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Short" }),
        })
      ).json(),
    );

    const short: Project = {
      ...created,
      forma: {
        clips: [
          ...created.forma.clips.filter((c) => c.kind === "countdown"),
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
    await fetch(`${baseUrl}/api/projects/${created.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(putBody(short)),
    });

    await fetch(`${baseUrl}/api/setlist/auto-advance`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });

    await fetch(`${baseUrl}/api/transport/load`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: created.id }),
    });
    await fetch(`${baseUrl}/api/transport/seek`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ positionTicks: 900 }),
    });
    await fetch(`${baseUrl}/api/transport/play`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: created.id }),
    });

    nowMs += 1000;
    await new Promise((r) => setTimeout(r, 80));

    const state = TransportStateSchema.parse(
      await (await fetch(`${baseUrl}/api/transport`)).json(),
    );
    expect(state.playing).toBe(false);
    expect(state.activeProjectId).toBe(created.id);
    expect(state.positionTicks).toBe(960);
  });
});
