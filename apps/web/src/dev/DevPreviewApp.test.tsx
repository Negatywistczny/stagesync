/* @vitest-environment jsdom */
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DevPreviewApp } from "./DevPreviewApp.js";

function setPreviewSearch(search: string): void {
  window.history.replaceState({}, "", `/_dev/preview${search}`);
}

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as MediaQueryList,
  );
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DevPreviewApp", () => {
  it("renders timeline preview without nested Router errors", () => {
    setPreviewSearch("?surface=web&path=/timeline&projectId=dev-preview");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<DevPreviewApp />)).not.toThrow();

    const nestedRouterErrors = consoleError.mock.calls
      .flat()
      .filter((msg) => String(msg).includes("cannot render a <Router>"));
    expect(nestedRouterErrors).toHaveLength(0);
  });
});
