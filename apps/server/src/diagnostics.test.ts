import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import {
  buildStoreZip,
  crc32,
  parseZipArchive,
  ZIP_PARSE_MAX_ENTRIES,
} from "./diagnostics-zip.js";
import { createFileLogger } from "./file-logger.js";
import { createLogBuffer } from "./log-buffer.js";
import { inflateRawSync, deflateRawSync } from "node:zlib";

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

  it("buildStoreZip empty archive still has EOCD; crc32 empty is 0", () => {
    const zip = buildStoreZip([]);
    expect(zip.subarray(0, 2).toString("binary")).toBe("PK");
    // End of central directory signature
    expect(zip.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06]))).toBe(true);
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });

  it("parseZipArchive round-trips STORE and DEFLATE entries", () => {
    const store = buildStoreZip([
      { name: "a.txt", data: Buffer.from("hello", "utf8") },
      { name: "dir/b.txt", data: Buffer.from("world", "utf8") },
    ]);
    const parsed = parseZipArchive(store);
    expect(parsed).toEqual([
      { name: "a.txt", data: Buffer.from("hello", "utf8") },
      { name: "dir/b.txt", data: Buffer.from("world", "utf8") },
    ]);

    // Hand-build a single DEFLATE entry via STORE shell + patch is heavy;
    // instead compress payload and splice into a minimal local+central zip.
    const payload = Buffer.from("deflated-payload-xxxx", "utf8");
    const compressed = deflateRawSync(payload);
    const nameBuf = Buffer.from("c.txt", "utf8");
    const { time, date } = (() => {
      const d = new Date(2020, 0, 1);
      return {
        time: (d.getHours() << 11) | (d.getMinutes() << 5) | 0,
        date: ((2020 - 1980) << 9) | (1 << 5) | 1,
      };
    })();
    const u16 = (n: number) => {
      const b = Buffer.alloc(2);
      b.writeUInt16LE(n & 0xffff, 0);
      return b;
    };
    const u32 = (n: number) => {
      const b = Buffer.alloc(4);
      b.writeUInt32LE(n >>> 0, 0);
      return b;
    };
    const crc = crc32(payload);
    const local = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      u16(20),
      u16(0),
      u16(8), // DEFLATE
      u16(time),
      u16(date),
      u32(crc),
      u32(compressed.length),
      u32(payload.length),
      u16(nameBuf.length),
      u16(0),
      nameBuf,
      compressed,
    ]);
    const central = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x01, 0x02]),
      u16(20),
      u16(20),
      u16(0),
      u16(8),
      u16(time),
      u16(date),
      u32(crc),
      u32(compressed.length),
      u32(payload.length),
      u16(nameBuf.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(0),
      nameBuf,
    ]);
    const end = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x05, 0x06]),
      u16(0),
      u16(0),
      u16(1),
      u16(1),
      u32(central.length),
      u32(local.length),
      u16(0),
    ]);
    const deflatedZip = Buffer.concat([local, central, end]);
    const deflatedParsed = parseZipArchive(deflatedZip);
    expect(deflatedParsed).toEqual([{ name: "c.txt", data: payload }]);
    // sanity: inflateRaw used under the hood matches
    expect(inflateRawSync(compressed).equals(payload)).toBe(true);
  });

  it("parseZipArchive rejects traversal names", () => {
    const zip = buildStoreZip([
      { name: "../evil.txt", data: Buffer.from("x", "utf8") },
    ]);
    expect(() => parseZipArchive(zip)).toThrow(/Niedozwolona/);
  });

  it("parseZipArchive rejects short buffers and absolute Unix paths", () => {
    expect(() => parseZipArchive(Buffer.from("PK"))).toThrow(
      /za krótkie|EOCD/i,
    );
    const abs = buildStoreZip([
      { name: "/etc/passwd", data: Buffer.from("x", "utf8") },
    ]);
    expect(() => parseZipArchive(abs)).toThrow(/Niedozwolona/);
  });

  it("parseZipArchive rejects archives over entry cap", () => {
    const entries = Array.from(
      { length: ZIP_PARSE_MAX_ENTRIES + 1 },
      (_, i) => ({
        name: `f${i}.txt`,
        data: Buffer.from("x", "utf8"),
      }),
    );
    const zip = buildStoreZip(entries);
    expect(() => parseZipArchive(zip)).toThrow(/zbyt wiele wpisów/);
  });

  it("parseZipArchive rejects unsupported compression methods", () => {
    const payload = Buffer.from("x", "utf8");
    const nameBuf = Buffer.from("weird.bin", "utf8");
    const u16 = (n: number) => {
      const b = Buffer.alloc(2);
      b.writeUInt16LE(n & 0xffff, 0);
      return b;
    };
    const u32 = (n: number) => {
      const b = Buffer.alloc(4);
      b.writeUInt32LE(n >>> 0, 0);
      return b;
    };
    const crc = crc32(payload);
    const method = 12; // bzip2 — unsupported
    const local = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      u16(20),
      u16(0),
      u16(method),
      u16(0),
      u16(0),
      u32(crc),
      u32(payload.length),
      u32(payload.length),
      u16(nameBuf.length),
      u16(0),
      nameBuf,
      payload,
    ]);
    const central = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x01, 0x02]),
      u16(20),
      u16(20),
      u16(0),
      u16(method),
      u16(0),
      u16(0),
      u32(crc),
      u32(payload.length),
      u32(payload.length),
      u16(nameBuf.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(0),
      nameBuf,
    ]);
    const end = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x05, 0x06]),
      u16(0),
      u16(0),
      u16(1),
      u16(1),
      u32(central.length),
      u32(local.length),
      u16(0),
    ]);
    expect(() => parseZipArchive(Buffer.concat([local, central, end]))).toThrow(
      /Nieobsługiwana kompresja/,
    );
  });

  it("parseZipArchive skips __MACOSX and .DS_Store entries", () => {
    const zip = buildStoreZip([
      { name: "__MACOSX/._a.txt", data: Buffer.from("meta", "utf8") },
      { name: "keep.txt", data: Buffer.from("ok", "utf8") },
      { name: "folder/.DS_Store", data: Buffer.from("ds", "utf8") },
    ]);
    expect(parseZipArchive(zip)).toEqual([
      { name: "keep.txt", data: Buffer.from("ok", "utf8") },
    ]);
  });

  it("parseZipArchive rejects absolute Windows drive paths", () => {
    const zip = buildStoreZip([
      { name: "C:/Windows/evil.txt", data: Buffer.from("x", "utf8") },
    ]);
    expect(() => parseZipArchive(zip)).toThrow(/Niedozwolona/);
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
