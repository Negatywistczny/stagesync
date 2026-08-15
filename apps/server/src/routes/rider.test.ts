import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../app.js";

async function listen(
  dataDir: string,
): Promise<{ server: Server; baseUrl: string }> {
  const { app } = createApp({ dataDir, disableFileLogs: true });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

describe("Concert Rider Easter Egg (/api/rider)", () => {
  const dirs: string[] = [];
  const servers: Server[] = [];

  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        (s) =>
          new Promise<void>((resolve) => {
            s.close(() => resolve());
          }),
      ),
    );
    await Promise.all(
      dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
    );
  });

  it("responds with full concert technical & hospitality rider on GET /api/rider", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "ss-rider-"));
    dirs.push(dataDir);
    const { server, baseUrl } = await listen(dataDir);
    servers.push(server);

    const res = await fetch(`${baseUrl}/api/rider`);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-stage-rider-status")).toBe("APPROVED");
    expect(res.headers.get("x-mms-clause")).toBe("NO-BROWN-MMS");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.ok).toBe(true);
    expect(json.event).toContain("StageSync Global Tour");
    const tech = json.technicalEquipment as { fohDesk: string[] };
    expect(tech.fohDesk.some((item) => item.includes("Gaffa Tape"))).toBe(true);
    expect(tech.fohDesk.some((item) => item.includes("to 11"))).toBe(true);
  });
});
