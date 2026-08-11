import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createStageRouter } from "./stage.js";
import type { ClientPresence } from "../presence/client-presence.js";
import type { StageHub } from "../transport/stage-hub.js";

describe("createStageRouter edges", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => (err ? reject(err) : resolve()));
    });
    server = undefined;
  });

  async function listen(
    stageHub: StageHub,
    presence: ClientPresence,
  ): Promise<string> {
    const app = express();
    app.use(express.json());
    app.use("/api/stage", createStageRouter(stageHub, presence));
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  it("lists messages/clients and clears/dismisses", async () => {
    const list = vi.fn(() => [{ id: "m1" }]);
    const clearAll = vi.fn();
    const dismiss = vi.fn((id: string) => id === "m1");
    const broadcast = vi.fn((msg: unknown) => ({
      ...(msg as object),
      id: "m2",
    }));
    const stageHub = {
      list,
      clearAll,
      dismiss,
      broadcast,
    } as unknown as StageHub;
    const presence = {
      list: vi.fn(() => [{ id: "c1" }]),
    } as unknown as ClientPresence;

    const baseUrl = await listen(stageHub, presence);

    expect((await fetch(`${baseUrl}/api/stage/messages`)).status).toBe(200);
    expect(
      (
        (await (await fetch(`${baseUrl}/api/stage/messages`)).json()) as {
          messages: unknown[];
        }
      ).messages,
    ).toEqual([{ id: "m1" }]);

    expect((await fetch(`${baseUrl}/api/stage/clients`)).status).toBe(200);

    const clear = await fetch(`${baseUrl}/api/stage/messages`, {
      method: "DELETE",
    });
    expect(clear.status).toBe(200);
    expect(clearAll).toHaveBeenCalled();

    const miss = await fetch(`${baseUrl}/api/stage/messages/nope`, {
      method: "DELETE",
    });
    expect(miss.status).toBe(404);

    const ok = await fetch(`${baseUrl}/api/stage/messages/m1`, {
      method: "DELETE",
    });
    expect(ok.status).toBe(200);
  });

  it("maps broadcast parse failures", async () => {
    const stageHub = {
      list: vi.fn(() => []),
      clearAll: vi.fn(),
      dismiss: vi.fn(),
      broadcast: vi.fn(),
    } as unknown as StageHub;
    const presence = { list: vi.fn(() => []) } as unknown as ClientPresence;
    const baseUrl = await listen(stageHub, presence);

    const res = await fetch(`${baseUrl}/api/stage/message`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "" }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(false);
  });
});
