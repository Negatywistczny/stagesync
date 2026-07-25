import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createMidiRouter } from "./routes/midi.js";
import type { MidiHost } from "./midi/host.js";

describe("createMidiRouter error paths", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => (err ? reject(err) : resolve()));
    });
    server = undefined;
  });

  async function listen(midi: MidiHost): Promise<string> {
    const app = express();
    app.use(express.json());
    app.use("/api/midi", createMidiRouter(midi));
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  it("maps getStatus / panic / devices failures to JSON errors", async () => {
    const boom = new Error("midi-down");
    const midi = {
      getStatus: vi.fn(() => {
        throw boom;
      }),
      setConfig: vi.fn(),
      panic: vi.fn(() => {
        throw boom;
      }),
    } as unknown as MidiHost;

    const baseUrl = await listen(midi);

    for (const path of ["/", "/devices"]) {
      const res = await fetch(`${baseUrl}/api/midi${path}`);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(((await res.json()) as { ok: boolean }).ok).toBe(false);
    }

    const panic = await fetch(`${baseUrl}/api/midi/panic`, { method: "POST" });
    expect(panic.status).toBeGreaterThanOrEqual(400);
    expect(((await panic.json()) as { ok: boolean }).ok).toBe(false);
  });
});
