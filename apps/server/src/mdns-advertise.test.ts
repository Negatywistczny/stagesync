import { afterEach, describe, expect, it, vi } from "vitest";

describe("mdns-advertise helpers", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.doUnmock("bonjour-service");
  });

  it("buildMdnsTxt includes hostname, project, status", async () => {
    const { buildMdnsTxt } = await import("./mdns-advertise.js");
    expect(
      buildMdnsTxt({
        hostname: "Studio-Mac.local",
        version: "5.0.1",
        project: "Overture",
        status: "PLAYING",
      }),
    ).toEqual({
      hostname: "Studio-Mac",
      version: "5.0.1",
      project: "Overture",
      status: "PLAYING",
      path: "admin",
    });
  });

  it("truncateMdnsTxtValue ellipsizes long values", async () => {
    const { truncateMdnsTxtValue } = await import("./mdns-advertise.js");
    const long = "a".repeat(80);
    const out = truncateMdnsTxtValue(long, 10);
    expect(out.length).toBe(10);
    expect(out.endsWith("…")).toBe(true);
  });

  it("normalizeMdnsHostname strips .local and falls back", async () => {
    const { normalizeMdnsHostname, truncateMdnsTxtValue } = await import(
      "./mdns-advertise.js"
    );
    expect(normalizeMdnsHostname("Studio.local")).toBe("Studio");
    expect(normalizeMdnsHostname("Studio.LOCAL.")).toBe("Studio");
    expect(normalizeMdnsHostname("   ")).toBe("localhost");
    expect(truncateMdnsTxtValue("ab", 1)).toBe("a");
    expect(truncateMdnsTxtValue("ab", 0)).toBe("");
  });
});

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

  it("publishes extended TXT when enabled", async () => {
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
      getMeta: () => ({
        hostname: "FOH-Laptop",
        version: "5.0.1",
        project: "Set A",
        status: "PAUSED",
      }),
      log: () => undefined,
    });
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "StageSync",
        type: "stagesync",
        port: 4000,
        txt: expect.objectContaining({
          version: "5.0.1",
          path: "admin",
          hostname: expect.any(String),
          project: expect.any(String),
          status: expect.stringMatching(/^(PLAYING|PAUSED|STOPPED)$/),
        }),
      }),
    );
    // Async getMeta refine may re-publish.
    await vi.waitFor(() => {
      expect(publish).toHaveBeenCalledWith(
        expect.objectContaining({
          txt: expect.objectContaining({
            hostname: "FOH-Laptop",
            project: "Set A",
            status: "PAUSED",
          }),
        }),
      );
    });
    adv.stop();
    expect(stop).toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();
  });

  // HW-LIF-12: Play/Pause flood must coalesce via REFRESH_DEBOUNCE_MS (400).
  it("debounces refresh to one re-publish after 400ms", async () => {
    vi.useFakeTimers();
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
    let status: "PLAYING" | "PAUSED" | "STOPPED" = "STOPPED";
    const { startMdnsAdvertiser } = await import("./mdns-advertise.js");
    const adv = startMdnsAdvertiser({
      port: 4000,
      bindHost: "0.0.0.0",
      version: "5.1.2",
      getMeta: () => ({
        hostname: "FOH",
        version: "5.1.2",
        project: "Set",
        status,
      }),
      log: () => undefined,
    });
    await vi.runAllTimersAsync();
    const afterBoot = publish.mock.calls.length;
    expect(afterBoot).toBeGreaterThanOrEqual(1);

    for (let i = 0; i < 10; i += 1) {
      status = i % 2 === 0 ? "PLAYING" : "PAUSED";
      adv.refresh();
    }
    await vi.advanceTimersByTimeAsync(399);
    expect(publish.mock.calls.length).toBe(afterBoot);

    status = "PLAYING";
    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();
    await Promise.resolve();

    expect(publish.mock.calls.length).toBe(afterBoot + 1);
    expect(publish.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        txt: expect.objectContaining({ status: "PLAYING" }),
      }),
    );
    adv.stop();
    vi.useRealTimers();
  });
});
