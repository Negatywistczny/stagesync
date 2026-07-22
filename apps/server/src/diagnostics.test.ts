import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { buildStoreZip, crc32 } from "./diagnostics-zip.js";
import { createFileLogger } from "./file-logger.js";
import { createLogBuffer } from "./log-buffer.js";

describe("file-logger + diagnostics zip (#351)", () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("writes rotating stagesync.log", async () => {
    dir = await mkdtemp(join(tmpdir(), "ss-flog-"));
    const logger = createFileLogger(dir, {
      maxBytes: 80,
      fileName: "stagesync.log",
    });
    logger.write("info", "hello-one");
    logger.write("warn", "hello-two-padding-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    logger.write("error", "hello-three-more-padding-yyyyyyyyyyyyyyyyyyyyyyyy");
    const text = await readFile(join(dir, "stagesync.log"), "utf8");
    expect(text).toContain("hello-three");
    const bak = await readFile(join(dir, "stagesync.log.1"), "utf8").catch(
      () => "",
    );
    expect(bak.includes("hello-one") || text.includes("hello-one")).toBe(true);
  });

  it("buildStoreZip produces PK header and recovers entry names", () => {
    const zip = buildStoreZip([
      { name: "meta.json", data: Buffer.from('{"ok":true}\n') },
      { name: "logs/stagesync.log", data: Buffer.from("line\n") },
    ]);
    expect(zip.subarray(0, 2).toString("binary")).toBe("PK");
    expect(zip.includes(Buffer.from("meta.json"))).toBe(true);
    expect(zip.includes(Buffer.from("logs/stagesync.log"))).toBe(true);
    expect(crc32(Buffer.from("abc"))).toBe(0x352441c2);
  });

  it("logBuffer onPush forwards to sink", () => {
    const seen: string[] = [];
    const buf = createLogBuffer({
      onPush: (e) => seen.push(`${e.level}:${e.msg}`),
    });
    buf.push("info", "ping");
    expect(seen).toEqual(["info:ping"]);
  });

  it("GET /api/system/diagnostics/export returns zip", async () => {
    dir = await mkdtemp(join(tmpdir(), "ss-diag-"));
    const logsDir = join(dir, "logs");
    await mkdir(logsDir, { recursive: true });
    await writeFile(join(logsDir, "stagesync.log"), "test-log-line\n");

    const { app, logBuffer } = createApp({
      dataDir: dir,
      staticDir: null,
      disableFileLogs: true,
    });
    logBuffer.push("info", "ring-entry");

    const server = createServer(app);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    const base = `http://127.0.0.1:${addr.port}`;
    try {
      const res = await fetch(`${base}/api/system/diagnostics/export`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/zip/);
      const buf = Buffer.from(await res.arrayBuffer());
      expect(buf.subarray(0, 2).toString("binary")).toBe("PK");
      expect(buf.includes(Buffer.from("ring-buffer.json"))).toBe(true);
      expect(buf.includes(Buffer.from("meta.json"))).toBe(true);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });
});
