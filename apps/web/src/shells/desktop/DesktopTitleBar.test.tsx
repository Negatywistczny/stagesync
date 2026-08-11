import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DesktopTitleBar } from "./DesktopTitleBar.js";

vi.mock("@lib/client/desktopBridge.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@lib/client/desktopBridge.js")>();
  return {
    ...actual,
    openExternalUrl: vi.fn(),
    minimizeAppWindow: vi.fn(),
    toggleMaximizeAppWindow: vi.fn(),
    closeAppWindow: vi.fn(),
    startWindowDragging: vi.fn(),
  };
});

vi.mock("@lib/client/lastTimelineProject.js", () => ({
  getRecentTimelineProjects: () => [],
}));

describe("DesktopTitleBar", () => {
  it("renders menubar starting at Plik and window controls", () => {
    const html = renderToStaticMarkup(<DesktopTitleBar />);
    expect(html).toContain("Menu aplikacji");
    // Wide viewport in SSR (matchMedia false): full menubar labels.
    expect(html).toContain(">Plik<");
    expect(html).toContain(">Edycja<");
    expect(html).toContain(">StageSync<");
    expect(html).toContain('aria-label="Minimalizuj"');
    expect(html).toContain('aria-label="Maksymalizuj"');
    expect(html).toContain('aria-label="Zamknij"');
  });
});
