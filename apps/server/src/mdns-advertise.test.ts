import { afterEach, describe, expect, it, vi } from "vitest";

describe("startMdnsAdvertiser", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.doUnmock("bonjour-service");
  });

  it("skips when STAGESYNC_DISABLE_MDNS is set", async () => {
    vi.stubEnv("STAGESYNC_DISABLE_MDNS", "1");
    const publish = vi.fn();
    vi.doMock("bonjour-service", () => ({
      Bonjour: class {
        publish = publish;
        destroy = vi.fn();
      },
    }));
    const { startMdnsAdvertiser } = await import("./mdns-advertise.js");
    const logs: string[] = [];
    const adv = startMdnsAdvertiser({
      port: 4000,
      bindHost: "0.0.0.0",
      version: "5.0.1",
      log: (m) => logs.push(m),
    });
    expect(publish).not.toHaveBeenCalled();
    expect(logs.some((l) => l.includes("DISABLE_MDNS"))).toBe(true);
    adv.stop();
  });

  it("skips when bind is loopback-only", async () => {
    vi.stubEnv("STAGESYNC_DISABLE_MDNS", "0");
    const publish = vi.fn();
    vi.doMock("bonjour-service", () => ({
      Bonjour: class {
        publish = publish;
        destroy = vi.fn();
      },
    }));
    const { startMdnsAdvertiser } = await import("./mdns-advertise.js");
    const logs: string[] = [];
    startMdnsAdvertiser({
      port: 4000,
      bindHost: "127.0.0.1",
      version: "5.0.1",
      log: (m) => logs.push(m),
    }).stop();
    expect(publish).not.toHaveBeenCalled();
    expect(logs.some((l) => l.includes("loopback"))).toBe(true);
  });

  it("publishes _stagesync service when enabled", async () => {
    vi.stubEnv("STAGESYNC_DISABLE_MDNS", "0");
    const stop = vi.fn();
    const destroy = vi.fn();
    const publish = vi.fn(() => ({ stop }));
    vi.doMock("bonjour-service", () => ({
      Bonjour: class {
        publish = publish;
        destroy = destroy;
      },
    }));
    const { startMdnsAdvertiser } = await import("./mdns-advertise.js");
    const adv = startMdnsAdvertiser({
      port: 4000,
      bindHost: "0.0.0.0",
      version: "5.0.1",
      log: () => undefined,
    });
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "stagesync",
        port: 4000,
        txt: expect.objectContaining({ version: "5.0.1", path: "admin" }),
      }),
    );
    adv.stop();
    expect(stop).toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();
  });
});
