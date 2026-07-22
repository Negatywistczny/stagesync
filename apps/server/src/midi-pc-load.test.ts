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
import { createMidiHost } from "./midi/host.js";
import { createMockMidiBackend } from "./midi/mock-backend.js";
import { createMidiProgramChangeHandler } from "./midi/program-change.js";
import { createStores } from "./storage/index.js";
import { createTransportEngine } from "./transport/engine.js";

function putBody(project: Project) {
  const { id, ...body } = project;
  void id;
  return PutProjectBodySchema.parse(body);
}

describe("MIDI program change → load project", () => {
  let dataDir: string;
  let server: Server;
  let baseUrl: string;
  let backend: ReturnType<typeof createMockMidiBackend>;
  let dispose: () => void;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ss-midi-pc-"));
    const stores = createStores(dataDir);
    const transport = createTransportEngine({ tickIntervalMs: 50 });
    backend = createMockMidiBackend();
    const midi = createMidiHost(transport, {
      backend,
      onProgramChange: createMidiProgramChangeHandler(transport, stores),
    });
    midi.setConfig({ inputId: "mock-in-1" });
    const { app } = createApp({ dataDir, stores, transport, midi });
    server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
    dispose = () => {
      midi.dispose();
      transport.dispose();
    };
  });

  afterEach(async () => {
    dispose();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await rm(dataDir, { recursive: true, force: true });
  });

  it("loads project matching midiProgramId and stops at home", async () => {
    const created = ProjectSchema.parse(
      await (
        await fetch(`${baseUrl}/api/projects`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "PC Song" }),
        })
      ).json(),
    );

    const withPc: Project = { ...created, midiProgramId: 12 };
    await fetch(`${baseUrl}/api/projects/${created.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(putBody(withPc)),
    });

    backend.emitInput({ type: "program", channel: 0, program: 12 });
    await new Promise((r) => setTimeout(r, 50));

    const state = TransportStateSchema.parse(
      await (await fetch(`${baseUrl}/api/transport`)).json(),
    );
    expect(state.activeProjectId).toBe(created.id);
    expect(state.playing).toBe(false);
    expect(state.positionTicks).toBe(transportHomeTicks(withPc));
  });
});
