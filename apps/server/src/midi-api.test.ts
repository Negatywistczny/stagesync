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

  beforeEach(async () => {
    const transport = createTransportEngine();
    const backend = createMockMidiBackend();
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
});
