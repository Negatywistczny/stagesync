import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/desktopBridge.js", () => ({
  isDesktopShell: vi.fn(() => false),
}));

import { isDesktopShell } from "../../lib/desktopBridge.js";
import { AppHeader } from "./AppHeader.js";

function html(node: React.ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
}

describe("AppHeader", () => {
  afterEach(() => {
    vi.mocked(isDesktopShell).mockReturnValue(false);
  });

  it("renders Level 1 chrome on web", () => {
    const out = html(
      <AppHeader
        suffix="Timeline"
        version="5.0.0"
        appJump={[
          { to: "/admin", label: "Admin" },
          { to: "/client", label: "Klient" },
        ]}
        onFullscreen={() => {}}
      />,
    );
    expect(out).toContain("Timeline");
    expect(out).toContain("Admin");
    expect(out).toContain('data-ss-level="1"');
  });

  it("returns null on desktop shell by default", () => {
    vi.mocked(isDesktopShell).mockReturnValue(true);
    const out = html(
      <AppHeader
        suffix="Admin"
        appJump={[{ to: "/client", label: "Klient" }]}
      />,
    );
    expect(out).toBe("");
  });

  it("renders on desktop when hideOnDesktop is false", () => {
    vi.mocked(isDesktopShell).mockReturnValue(true);
    const out = html(
      <AppHeader
        suffix="Admin"
        hideOnDesktop={false}
        appJump={[{ to: "/client", label: "Klient" }]}
      />,
    );
    expect(out).toContain("Admin");
    expect(out).toContain('data-ss-level="1"');
  });

  it("emphasizes Zapisz when history.dirty — no niezapisane copy", () => {
    const out = html(
      <AppHeader
        suffix="Timeline"
        appJump={[{ to: "/admin", label: "Admin" }]}
        history={{
          canUndo: true,
          canRedo: false,
          dirty: true,
          onUndo: () => {},
          onRedo: () => {},
          onSave: () => {},
          onDiscard: () => {},
        }}
      />,
    );
    expect(out).not.toMatch(/niezapisane/i);
    expect(out).toContain("Zapisz");
    expect(out).toContain("Odrzuć");
    expect(out).toContain("aria-pressed=\"true\"");
    expect(out).toContain("Cofnij");
  });
});
