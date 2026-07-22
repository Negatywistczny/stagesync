import { createServer, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ProjectSchema,
  PutProjectBodySchema,
  type Project,
} from "@stagesync/shared";
import { createApp } from "./app.js";
import { createMidiHost } from "./midi/host.js";
import { createMockMidiBackend } from "./midi/mock-backend.js";
import { createStores } from "./storage/index.js";
import { createTransportEngine } from "./transport/engine.js";

function putBody(project: Project) {
  const { id, ...body } = project;
  void id;
  return PutProjectBodySchema.parse(body);
}

describe("MIDI program change OUT on load", () => {
  let dataDir: string;
  let server: Server;
  let baseUrl: string;
  let backend: ReturnType<typeof createMockMidiBackend>;
  let dispose: () => void;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ss-midi-pc-out-"));
    const stores = createStores(dataDir);
    const transport = createTransportEngine({ tickIntervalMs: 50 });
    backend = createMockMidiBackend();
    const midi = createMidiHost(transport, { backend });
    midi.setConfig({ outputId: "mock-out-1" });
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

  it("sends program change when loading a project with midiProgramId", async () => {
    const created = ProjectSchema.parse(
      await (
        await fetch(`${baseUrl}/api/projects`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "PC Out" }),
        })
      ).json(),
    );
    const withPc: Project = { ...created, midiProgramId: 19 };
    await fetch(`${baseUrl}/api/projects/${created.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(putBody(withPc)),
    });

    await fetch(`${baseUrl}/api/transport/load`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: created.id }),
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(backend.sent).toContainEqual({
      type: "program",
      channel: 0,
      program: 19,
    });
  });
});
