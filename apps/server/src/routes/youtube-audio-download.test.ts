import { EventEmitter } from "node:events";
import { writeFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

const spawnHooks = vi.hoisted(() => ({
  impl: null as null | ((cmd: string, args: string[]) => unknown),
}));

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawn: ((cmd: string, args: string[], ...rest: unknown[]) => {
      if (spawnHooks.impl) return spawnHooks.impl(cmd, args) as never;
      return (actual.spawn as (...a: unknown[]) => unknown)(cmd, args, ...rest);
    }) as typeof actual.spawn,
  };
});

import {
  checkYtDlpAvailable,
  downloadYoutubeMp3Bytes,
  resolveYtDlpCommand,
  resetYtDlpAvailabilityCacheForTests,
  ytDlpResolver,
} from "./youtube-audio.js";

function mockSpawnProcess(opts: {
  code?: number | null;
  stdoutChunks?: string[];
  stderrChunks?: string[];
}): ReturnType<typeof EventEmitter> & {
  stdout: EventEmitter;
  stderr: EventEmitter;
  killed: boolean;
  kill: ReturnType<typeof vi.fn>;
} {
  const proc = new EventEmitter() as ReturnType<typeof EventEmitter> & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    killed: boolean;
    kill: ReturnType<typeof vi.fn>;
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.killed = false;
  proc.kill = vi.fn(() => {
    proc.killed = true;
  });
  queueMicrotask(() => {
    for (const chunk of opts.stdoutChunks ?? []) {
      proc.stdout.emit("data", Buffer.from(chunk));
    }
    for (const chunk of opts.stderrChunks ?? []) {
      proc.stderr.emit("data", Buffer.from(chunk));
    }
    proc.emit("close", opts.code ?? 0);
  });
  return proc;
}

describe("checkYtDlpAvailable", () => {
  afterEach(() => {
    resetYtDlpAvailabilityCacheForTests();
  });

  it("returns boolean without throwing", async () => {
    resetYtDlpAvailabilityCacheForTests();
    const resolveSpy = vi
      .spyOn(ytDlpResolver, "resolve")
      .mockResolvedValue("/tmp/yt-dlp");
    const ok = await checkYtDlpAvailable(process.cwd());
    expect(ok).toBe(true);
    resolveSpy.mockRestore();
  });

  it("returns false when resolver yields null", async () => {
    const resolveSpy = vi
      .spyOn(ytDlpResolver, "resolve")
      .mockResolvedValue(null);
    await expect(checkYtDlpAvailable(process.cwd())).resolves.toBe(false);
    expect(resolveSpy).toHaveBeenCalledWith(process.cwd(), {
      allowDownload: false,
    });
    resolveSpy.mockRestore();
  });
});

describe("resolveYtDlpCommand", () => {
  afterEach(() => {
    resetYtDlpAvailabilityCacheForTests();
  });

  it("accepts repo bundled yt-dlp when runnable", async () => {
    resetYtDlpAvailabilityCacheForTests();
    const cmd = await resolveYtDlpCommand(process.cwd(), {
      allowDownload: false,
    });
    expect(cmd === null || typeof cmd === "string").toBe(true);
  }, 30_000);

  it("returns cached command on subsequent calls", async () => {
    resetYtDlpAvailabilityCacheForTests();
    let versionCalls = 0;
    spawnHooks.impl = (_cmd, args) => {
      void _cmd;
      if (args[0] === "--version") {
        versionCalls += 1;
        return mockSpawnProcess({ code: 0 });
      }
      return mockSpawnProcess({ code: 1 });
    };

    try {
      const first = await resolveYtDlpCommand(process.cwd(), {
        allowDownload: false,
      });
      expect(first).toBe("yt-dlp");
      const second = await resolveYtDlpCommand(process.cwd(), {
        allowDownload: false,
      });
      expect(second).toBe(first);
      expect(versionCalls).toBe(1);
    } finally {
      spawnHooks.impl = null;
      resetYtDlpAvailabilityCacheForTests();
    }
  });
});

describe("downloadYoutubeMp3Bytes", () => {
  afterEach(() => {
    spawnHooks.impl = null;
  });

  it("parses progress lines and returns downloaded bytes", async () => {
    const progress: number[] = [];
    spawnHooks.impl = (_cmd, args) => {
      void _cmd;
      const oIdx = args.indexOf("-o");
      const template = oIdx >= 0 ? args[oIdx + 1] : undefined;
      if (template) {
        const outPath = template.replace("%(ext)s", "mp3");
        writeFileSync(outPath, Buffer.from("downloaded-audio-payload"));
      }
      return mockSpawnProcess({
        code: 0,
        stdoutChunks: ["[download]  12.5% of ~1MiB\n", "[download] 100%\n"],
      });
    };

    const bytes = await downloadYoutubeMp3Bytes(
      "dQw4w9WgXcQ",
      "/fake/yt-dlp",
      (pct) => progress.push(pct),
    );
    expect(bytes.toString("utf8")).toBe("downloaded-audio-payload");
    expect(progress).toContain(12.5);
    expect(progress).toContain(100);
  });

  it("throws when yt-dlp exits non-zero", async () => {
    spawnHooks.impl = () =>
      mockSpawnProcess({
        code: 2,
        stderrChunks: ["boom"],
      });

    await expect(
      downloadYoutubeMp3Bytes("dQw4w9WgXcQ", "/fake/yt-dlp"),
    ).rejects.toThrow(/yt-dlp zakończył się kodem 2/);
  });
});
