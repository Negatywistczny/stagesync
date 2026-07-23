import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";

const spawnMock = vi.hoisted(() =>
  vi.fn(() => ({
    unref: vi.fn(),
  })),
);

vi.mock("node:child_process", () => ({
  spawn: spawnMock,
}));

import {
  createLifecycle,
  isRunningUnderPm2,
} from "./lifecycle.js";

function mockServer(opts?: {
  closeImpl?: (cb?: (err?: Error) => void) => void;
}): Server & { close: ReturnType<typeof vi.fn> } {
  const close =
    opts?.closeImpl != null
      ? vi.fn(opts.closeImpl)
      : vi.fn((cb?: (err?: Error) => void) => {
          cb?.();
        });
  return { close } as unknown as Server & { close: ReturnType<typeof vi.fn> };
}

describe("createLifecycle", () => {
  const logs: string[] = [];
  let exitSpy: ReturnType<typeof vi.spyOn>;
  const prevPmId = process.env.pm_id;
  const prevPm2Home = process.env.PM2_HOME;

  beforeEach(() => {
    logs.length = 0;
    spawnMock.mockClear();
    spawnMock.mockReturnValue({ unref: vi.fn() });
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      /* swallow */
    }) as never);
    delete process.env.pm_id;
    delete process.env.PM2_HOME;
    vi.useFakeTimers();
  });

  afterEach(() => {
    exitSpy.mockRestore();
    vi.useRealTimers();
    if (prevPmId === undefined) delete process.env.pm_id;
    else process.env.pm_id = prevPmId;
    if (prevPm2Home === undefined) delete process.env.PM2_HOME;
    else process.env.PM2_HOME = prevPm2Home;
  });

  it("isRunningUnderPm2 reads pm_id / PM2_HOME", () => {
    expect(isRunningUnderPm2()).toBe(false);
    process.env.pm_id = "1";
    expect(isRunningUnderPm2()).toBe(true);
    delete process.env.pm_id;
    process.env.PM2_HOME = "/tmp/pm2";
    expect(isRunningUnderPm2()).toBe(true);
  });

  it("gracefulShutdown closes server, logs, and exits", () => {
    const server = mockServer();
    const onBeforeClose = vi.fn();
    const life = createLifecycle(server, {
      onBeforeClose,
      log: (m) => logs.push(m),
    });

    expect(life.isShuttingDown()).toBe(false);
    life.gracefulShutdown("SIGTERM");
    expect(life.isShuttingDown()).toBe(true);
    expect(onBeforeClose).toHaveBeenCalledOnce();
    expect(server.close).toHaveBeenCalledOnce();
    expect(logs.some((l) => l.includes("Graceful shutdown started (SIGTERM)"))).toBe(
      true,
    );
    expect(logs.some((l) => l.includes("HTTP server closed"))).toBe(true);
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("ignores second gracefulShutdown while shutting down", () => {
    const server = mockServer();
    const life = createLifecycle(server, { log: (m) => logs.push(m) });
    life.gracefulShutdown("SIGINT");
    life.gracefulShutdown("SIGINT");
    expect(server.close).toHaveBeenCalledOnce();
  });

  it("swallows onBeforeClose errors", () => {
    const server = mockServer();
    const life = createLifecycle(server, {
      onBeforeClose: () => {
        throw new Error("boom");
      },
      log: (m) => logs.push(m),
    });
    expect(() => life.gracefulShutdown("SIGTERM")).not.toThrow();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("force-exits after shutdown timeout when close never finishes", () => {
    const server = mockServer({
      closeImpl: () => {
        /* never call callback */
      },
    });
    const life = createLifecycle(server, { log: (m) => logs.push(m) });
    life.gracefulShutdown("SIGTERM");
    expect(exitSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(8_000);
    expect(logs.some((l) => l.includes("Shutdown timeout"))).toBe(true);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("spawns detached restart process when restart requested (non-PM2)", () => {
    const server = mockServer();
    const life = createLifecycle(server, { log: (m) => logs.push(m) });
    life.gracefulShutdown("SIGTERM", { restart: true });

    expect(logs.some((l) => l.includes("restart"))).toBe(true);
    expect(spawnMock).toHaveBeenCalledOnce();
    expect(spawnMock.mock.calls[0]![0]).toBe(process.execPath);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("defers restart spawn under PM2", () => {
    process.env.pm_id = "9";
    const server = mockServer();
    const life = createLifecycle(server, { log: (m) => logs.push(m) });
    life.gracefulShutdown("SIGTERM", { restart: true });
    expect(spawnMock).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("scheduleProcessRestart logs under PM2", () => {
    process.env.PM2_HOME = "/x";
    const life = createLifecycle(mockServer(), { log: (m) => logs.push(m) });
    life.scheduleProcessRestart();
    expect(logs.some((l) => l.includes("Restart under PM2"))).toBe(true);
  });

  it("scheduleProcessRestart is silent without PM2", () => {
    const life = createLifecycle(mockServer(), { log: (m) => logs.push(m) });
    life.scheduleProcessRestart();
    expect(logs).toEqual([]);
  });

  it("logs spawn failure without throwing", () => {
    spawnMock.mockImplementationOnce(() => {
      throw new Error("spawn fail");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const server = mockServer();
    const life = createLifecycle(server, { log: (m) => logs.push(m) });
    life.gracefulShutdown("SIGTERM", { restart: true });
    expect(errSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
    errSpy.mockRestore();
  });

  it("delays exit on win32 when restarting", () => {
    const platform = vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    const server = mockServer();
    const life = createLifecycle(server, { log: (m) => logs.push(m) });
    life.gracefulShutdown("SIGTERM", { restart: true });
    expect(exitSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(spawnMock).toHaveBeenCalledOnce();
    expect(exitSpy).toHaveBeenCalledWith(0);
    platform.mockRestore();
  });

  it("uses default console.log when log option omitted", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const server = mockServer();
    const life = createLifecycle(server);
    life.gracefulShutdown("SIGTERM");
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
