import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFileLogger,
  installConsoleFileMirror,
} from "./file-logger.js";

describe("file-logger", () => {
  const dirs: string[] = [];
  const disposers: Array<() => void> = [];

  afterEach(() => {
    for (const d of disposers.splice(0)) d();
    vi.restoreAllMocks();
    for (const dir of dirs.splice(0)) {
      try {
        chmodSync(dir, 0o755);
      } catch {
        /* ignore */
      }
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function tmpDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "ss-flog-unit-"));
    dirs.push(dir);
    return dir;
  }

  it("rotates when over maxBytes and replaces previous .1", () => {
    const dir = tmpDir();
    const logPath = join(dir, "stagesync.log");
    writeFileSync(logPath, "x".repeat(100), "utf8");
    writeFileSync(`${logPath}.1`, "old-bak", "utf8");

    const logger = createFileLogger(dir, { maxBytes: 50 });
    logger.write("info", "after-rotate", 1_700_000_000_000);

    const current = readFileSync(logPath, "utf8");
    const bak = readFileSync(`${logPath}.1`, "utf8");
    expect(bak).toContain("x".repeat(100));
    expect(current).toContain("after-rotate");
    expect(current).not.toContain("old-bak");
  });

  it("defaults empty level to info and strips newlines", () => {
    const dir = tmpDir();
    const logger = createFileLogger(dir, { fileName: "custom.log" });
    logger.write("   ", "line1\nline2\r\nline3");
    const text = readFileSync(join(dir, "custom.log"), "utf8");
    expect(text).toMatch(/\[info\] line1 line2 line3/);
  });

  it("swallows write failures without throwing", () => {
    const dir = tmpDir();
    const logger = createFileLogger(dir);
    mkdirSync(join(dir, "stagesync.log")); // path is a directory → append fails
    expect(() => logger.write("error", "must-not-throw")).not.toThrow();
  });

  it("mirrors console levels into the file and restores on dispose", () => {
    const dir = tmpDir();
    const logger = createFileLogger(dir);
    const dispose = installConsoleFileMirror(logger);
    disposers.push(dispose);

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const errNoStack = new Error("msg-only");
    delete (errNoStack as { stack?: string }).stack;

    console.log("plain-log");
    console.info({ ok: true });
    console.warn(errNoStack);
    console.error(circular);
    console.debug("dbg");

    dispose();
    console.log("after-dispose-only-console");

    const text = readFileSync(join(dir, "stagesync.log"), "utf8");
    expect(text).toContain("[info] plain-log");
    expect(text).toContain('{"ok":true}');
    expect(text).toMatch(/\[warn\].*msg-only/);
    expect(text).toContain("[error] [object Object]");
    expect(text).toContain("[debug] dbg");
    expect(text).not.toContain("after-dispose-only-console");
  });
});
