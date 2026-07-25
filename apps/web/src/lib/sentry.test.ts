import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("initWebSentry", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("is a no-op when VITE_SENTRY_DSN is unset", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "");
    const init = vi.fn();
    vi.doMock("@sentry/react", () => ({ init, captureException: vi.fn() }));
    const { initWebSentry, isWebSentryEnabled } = await import("./sentry.js");
    expect(initWebSentry()).toBe(false);
    expect(isWebSentryEnabled()).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it("initializes when VITE_SENTRY_DSN is set", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://key@example.com/1");
    const init = vi.fn();
    vi.doMock("@sentry/react", () => ({ init, captureException: vi.fn() }));
    const { initWebSentry, isWebSentryEnabled } = await import("./sentry.js");
    expect(initWebSentry()).toBe(true);
    expect(isWebSentryEnabled()).toBe(true);
    expect(init).toHaveBeenCalledOnce();
    expect(init.mock.calls[0]?.[0]).toMatchObject({
      dsn: "https://key@example.com/1",
      sendDefaultPii: false,
    });
  });

  it("fails soft when Sentry.init throws", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://key@example.com/1");
    vi.doMock("@sentry/react", () => ({
      init: () => {
        throw new Error("boom");
      },
      captureException: vi.fn(),
    }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { initWebSentry, isWebSentryEnabled } = await import("./sentry.js");
    expect(initWebSentry()).toBe(false);
    expect(isWebSentryEnabled()).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});
