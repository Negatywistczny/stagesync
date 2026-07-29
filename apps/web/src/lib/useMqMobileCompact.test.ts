/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("./operatorSurface.js", () => ({
  shouldUseMobileCompactChrome: vi.fn(() => true),
}));

import { shouldUseMobileCompactChrome } from "./operatorSurface.js";
import { useMqMobileCompact } from "./useMqMobileCompact.js";

function stubMatchMedia(matchesCompact: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: matchesCompact && query.includes("max-width: 640"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }),
  });
}

describe("useMqMobileCompact", () => {
  afterEach(() => {
    vi.mocked(shouldUseMobileCompactChrome).mockReturnValue(true);
  });

  it("matches compact media on web / Console", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useMqMobileCompact());
    expect(result.current).toBe(true);
  });

  it("stays false on Tauri desktop even when viewport is ≤640px", () => {
    vi.mocked(shouldUseMobileCompactChrome).mockReturnValue(false);
    stubMatchMedia(true);
    const { result } = renderHook(() => useMqMobileCompact());
    expect(result.current).toBe(false);
  });
});
