import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MidiHostStatusSchema } from "@stagesync/shared";
import { createApp } from "./app.js";
import { createMidiHost } from "./midi/host.js";
import { createMockMidiBackend } from "./midi/mock-backend.js";
import { createTransportEngine } from "./transport/engine.js";

describe("midi REST API", () => {
  let server: Server;
  let baseUrl: string;
  let dispose: () => void;
  let backend: ReturnType<typeof createMockMidiBackend>;

  beforeEach(async () => {
    const transport = createTransportEngine();
    backend = createMockMidiBackend();
    const midi = createMidiHost(transport, { backend });
    dispose = () => {
      midi.dispose();
      transport.dispose();
    };
    const { app } = createApp({ transport, midi });
    server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    dispose();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("GET /api/midi returns status", async () => {
    const res = await fetch(`${baseUrl}/api/midi`);
    expect(res.status).toBe(200);
    const status = MidiHostStatusSchema.parse(await res.json());
    expect(status.backend).toBe("mock");
    expect(status.inputs[0]?.id).toBe("mock-in-1");
  });

  it("PUT /api/midi/config selects ports", async () => {
    const res = await fetch(`${baseUrl}/api/midi/config`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        inputId: "mock-in-1",
        outputId: "mock-out-1",
        clockOutEnabled: true,
      }),
    });
    expect(res.status).toBe(200);
    const status = MidiHostStatusSchema.parse(await res.json());
    expect(status.config.inputId).toBe("mock-in-1");
    expect(status.config.outputId).toBe("mock-out-1");
  });

  it("PUT /api/midi/config fail-fast on bad body", async () => {
    const res = await fetch(`${baseUrl}/api/midi/config`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clockOutEnabled: "yes" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/midi/panic sends CC 120/121/123 on all channels", async () => {
    await fetch(`${baseUrl}/api/midi/config`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ outputId: "mock-out-1" }),
    });
    backend.sent.length = 0;

    const res = await fetch(`${baseUrl}/api/midi/panic`, { method: "POST" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      sent: boolean;
      channels: number;
    };
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(true);
    expect(body.channels).toBe(16);

    const ccs = backend.sent.filter((m) => m.type === "cc");
    expect(ccs).toHaveLength(16 * 3);
    expect(
      ccs.every(
        (m) =>
          m.type === "cc" &&
          (m.controller === 120 ||
            m.controller === 121 ||
            m.controller === 123) &&
          m.value === 0,
      ),
    ).toBe(true);

    for (let ch = 0; ch < 16; ch += 1) {
      for (const controller of [120, 121, 123]) {
        expect(
          ccs.some(
            (m) =>
              m.type === "cc" &&
              m.channel === ch &&
              m.controller === controller,
          ),
        ).toBe(true);
      }
    }
  });

  it("POST /api/midi/panic without output reports sent=false", async () => {
    const res = await fetch(`${baseUrl}/api/midi/panic`, { method: "POST" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { sent: boolean; channels: number };
    expect(body.sent).toBe(false);
    expect(body.channels).toBe(0);
    expect(backend.sent.filter((m) => m.type === "cc")).toHaveLength(0);
  });
});
