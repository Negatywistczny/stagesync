/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDevPreviewScreenshotFilename,
  DEV_PREVIEW_SCREENSHOT_REQUEST,
  DEV_PREVIEW_SCREENSHOT_RESPONSE,
  formatDevPreviewScreenshotTimestamp,
  requestDevPreviewScreenshot,
} from "./devPreviewScreenshot.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("devPreviewScreenshot helpers", () => {
  it("builds filename with surface, route, viewport and timestamp", () => {
    expect(
      buildDevPreviewScreenshotFilename(
        "web",
        "/admin",
        "phone",
        "20260729-144800",
      ),
    ).toBe("web-admin-phone-20260729-144800.png");
  });

  it("formats timestamp for filenames", () => {
    expect(
      formatDevPreviewScreenshotTimestamp(new Date("2026-07-29T14:48:00")),
    ).toBe("20260729-144800");
  });
});

describe("requestDevPreviewScreenshot", () => {
  it("requests capture from iframe and resolves PNG blob", async () => {
    const iframe = document.createElement("iframe");
    const childWindow = {
      postMessage: vi.fn(),
    } as unknown as Window;
    Object.defineProperty(iframe, "contentWindow", {
      value: childWindow,
      configurable: true,
    });

    const promise = requestDevPreviewScreenshot(iframe, 375, 667);

    const requestCall = (
      childWindow.postMessage as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(requestCall?.[0]).toMatchObject({
      type: DEV_PREVIEW_SCREENSHOT_REQUEST,
      width: 375,
      height: 667,
    });

    const requestId = requestCall?.[0]?.requestId as string;
    window.dispatchEvent(
      new MessageEvent("message", {
        source: childWindow,
        data: {
          type: DEV_PREVIEW_SCREENSHOT_RESPONSE,
          requestId,
          ok: true,
          dataUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        },
      }),
    );

    const blob = await promise;
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
  });
});
