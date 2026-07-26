import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("initServerSentry", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is a no-op when SENTRY_DSN is unset", async () => {
    vi.stubEnv("SENTRY_DSN", "");
    const init = vi.fn();
    vi.doMock("@sentry/node", () => ({ init, captureException: vi.fn() }));
    const { initServerSentry, isServerSentryEnabled } = await import(
      "./sentry.js"
    );
    expect(await initServerSentry()).toBe(false);
    expect(isServerSentryEnabled()).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it("initializes when SENTRY_DSN is set", async () => {
    vi.stubEnv("SENTRY_DSN", "https://key@example.com/1");
    const init = vi.fn();
    vi.doMock("@sentry/node", () => ({ init, captureException: vi.fn() }));
    const { initServerSentry, isServerSentryEnabled } = await import(
      "./sentry.js"
    );
    expect(await initServerSentry()).toBe(true);
    expect(isServerSentryEnabled()).toBe(true);
    expect(init).toHaveBeenCalledOnce();
    expect(init.mock.calls[0]?.[0]).toMatchObject({
      dsn: "https://key@example.com/1",
      sendDefaultPii: false,
    });
  });

  it("fails soft when Sentry.init throws", async () => {
    vi.stubEnv("SENTRY_DSN", "https://key@example.com/1");
    vi.doMock("@sentry/node", () => ({
      init: () => {
        throw new Error("boom");
      },
      captureException: vi.fn(),
    }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { initServerSentry, isServerSentryEnabled } = await import(
      "./sentry.js"
    );
    expect(await initServerSentry()).toBe(false);
    expect(isServerSentryEnabled()).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});
