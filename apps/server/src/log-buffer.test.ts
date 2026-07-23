import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { createLogBuffer } from "./log-buffer.js";

function mockRes(writeImpl?: (chunk: string) => void): Response {
  return {
    write: vi.fn(writeImpl ?? (() => true)),
  } as unknown as Response;
}

describe("log-buffer", () => {
  it("keeps max lines, defaults empty level, and truncates msg", () => {
    const buffer = createLogBuffer({ maxLines: 3 });
    buffer.push("info", "a");
    buffer.push("info", "b");
    buffer.push("info", "c");
    buffer.push("   ", "d".repeat(600));
    const lines = buffer.getLines();
    expect(lines.map((l) => l.msg[0])).toEqual(["b", "c", "d"]);
    expect(lines[2]?.level).toBe("info");
    expect(lines[2]?.msg).toHaveLength(500);
    buffer.clear();
    expect(buffer.getLines()).toEqual([]);
  });

  it("swallows onPush sink errors", () => {
    const buffer = createLogBuffer({
      onPush: () => {
        throw new Error("sink down");
      },
    });
    expect(() => buffer.push("warn", "still-ok")).not.toThrow();
    expect(buffer.getLines()).toHaveLength(1);
  });

  it("fans out to SSE clients, replays history, and drops failing writers", () => {
    const buffer = createLogBuffer({ maxLines: 10 });
    buffer.push("info", "pre");

    const ok = mockRes();
    const removeOk = buffer.addSseClient(ok);
    expect(ok.write).toHaveBeenCalledWith(
      expect.stringContaining('"msg":"pre"'),
    );
    expect(buffer.clientCount()).toBe(1);

    const boom = mockRes(() => {
      throw new Error("broken pipe");
    });
    // empty history so addSseClient itself does not throw
    const empty = createLogBuffer();
    empty.addSseClient(boom);
    expect(empty.clientCount()).toBe(1);
    empty.push("error", "live");
    expect(empty.clientCount()).toBe(0);

    buffer.clear();
    expect(ok.write).toHaveBeenCalledWith(
      expect.stringContaining("event: clear"),
    );

    const clearBoom = mockRes(() => {
      throw new Error("clear fail");
    });
    buffer.addSseClient(clearBoom);
    expect(buffer.clientCount()).toBe(2);
    buffer.clear();
    expect(buffer.clientCount()).toBe(1);

    removeOk();
    expect(buffer.clientCount()).toBe(0);
  });
});
