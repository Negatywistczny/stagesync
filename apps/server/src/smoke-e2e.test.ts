/**
 * Smoke E2E (in-process): health → create → load → play → stop → midi.
 * Runs in CI via `pnpm test` (no browser / Playwright required).
 */

import { createServer, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  HealthResponseSchema,
  MidiHostStatusSchema,
  ProjectSchema,
  TransportStateSchema,
} from "@stagesync/shared";
import { createApp } from "./app.js";
import { createTransportEngine } from "./transport/engine.js";

describe("smoke e2e API", () => {
  let dataDir: string;
  let server: Server;
  let baseUrl: string;
  let disposeTransport: () => void;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ss-smoke-"));
    const transport = createTransportEngine();
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

  it("health → project → transport load/play/stop → midi status", async () => {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    expect(healthRes.status).toBe(200);
    const health = HealthResponseSchema.parse(await healthRes.json());
    expect(health.ok).toBe(true);

    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Smoke Song" }),
    });
    expect(createRes.status).toBe(201);
    const project = ProjectSchema.parse(await createRes.json());
    expect(project.name).toBe("Smoke Song");

    const loadRes = await fetch(`${baseUrl}/api/transport/load`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: project.id }),
    });
    expect(loadRes.status).toBe(200);
    expect(TransportStateSchema.parse(await loadRes.json()).activeProjectId).toBe(
      project.id,
    );

    const playRes = await fetch(`${baseUrl}/api/transport/play`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: project.id }),
    });
    expect(playRes.status).toBe(200);
    expect(TransportStateSchema.parse(await playRes.json()).playing).toBe(true);

    const stopRes = await fetch(`${baseUrl}/api/transport/stop`, {
      method: "POST",
    });
    expect(stopRes.status).toBe(200);
    const stopped = TransportStateSchema.parse(await stopRes.json());
    expect(stopped.playing).toBe(false);

    const midiRes = await fetch(`${baseUrl}/api/midi`);
    expect(midiRes.status).toBe(200);
    expect(MidiHostStatusSchema.parse(await midiRes.json()).backend).toBeTruthy();
  });
});
