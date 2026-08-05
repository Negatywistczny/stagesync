import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/shell-operator/operatorSurface.js", () => ({
  shouldShowOperatorNav: vi.fn(
    (pathname: string) =>
      pathname.startsWith("/admin") || pathname.startsWith("/timeline"),
  ),
  isOsMenuDesktopShell: vi.fn(() => false),
}));

vi.mock("../../lib/client/useMqMobileCompact.js", () => ({
  useMqMobileCompact: vi.fn(() => false),
}));

import { isOsMenuDesktopShell, shouldShowOperatorNav } from "../../lib/shell-operator/operatorSurface.js";
import { useMqMobileCompact } from "../../lib/client/useMqMobileCompact.js";
import { AppHeader } from "./AppHeader.js";

function html(node: React.ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
}

describe("AppHeader", () => {
  afterEach(() => {
    vi.mocked(isOsMenuDesktopShell).mockReturnValue(false);
    vi.mocked(useMqMobileCompact).mockReturnValue(false);
    vi.mocked(shouldShowOperatorNav).mockImplementation(
      (pathname: string) =>
        pathname.startsWith("/admin") || pathname.startsWith("/timeline"),
    );
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

  it("hides chrome actions on OS-menu desktop shell by default", () => {
    vi.mocked(isOsMenuDesktopShell).mockReturnValue(true);
    const out = html(
      <AppHeader
        suffix="Admin"
        appJump={[{ to: "/client", label: "Klient" }]}
      />,
    );
    expect(out).toContain("Admin");
    expect(out).toContain("Klient");
    expect(out).not.toContain('aria-label="Ustawienia"');
  });

  it("keeps settings gear when only :4000 desktop heuristic matches", () => {
    // isOsMenuDesktopShell stays false — plain browser must not lose L1 chrome.
    const out = html(
      <AppHeader
        suffix="Timeline"
        appJump={[{ to: "/admin", label: "Admin" }]}
      />,
    );
    expect(out).toContain('aria-label="Ustawienia"');
  });

  it("renders on OS-menu desktop when hideOnDesktop is false", () => {
    vi.mocked(isOsMenuDesktopShell).mockReturnValue(true);
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

  it("hides L1 header on compact mobile when operatorNavExternal", () => {
    vi.mocked(useMqMobileCompact).mockReturnValue(true);
    const out = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/timeline/p1"]}>
        <AppHeader
          suffix="Timeline"
          version="5.0.0"
          operatorApp="timeline"
          operatorNavExternal
          appJump={[
            { to: "/admin", label: "Admin" },
            { to: "/client", label: "Klient" },
          ]}
        />
      </MemoryRouter>,
    );
    expect(out).toBe("");
  });

  it("hides app jump and settings on compact mobile when operatorApp is set", () => {
    vi.mocked(useMqMobileCompact).mockReturnValue(true);
    const out = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/timeline/p1"]}>
        <AppHeader
          suffix="Timeline"
          version="5.0.0"
          operatorApp="timeline"
          appJump={[
            { to: "/admin", label: "Admin" },
            { to: "/client", label: "Klient" },
          ]}
        />
      </MemoryRouter>,
    );
    expect(out).not.toContain('aria-label="Aplikacje"');
    expect(out).not.toContain('aria-label="Ustawienia"');
    expect(out).toContain('data-ss-level="1"');
  });

  it("shows app jump chips on tablet when operatorApp is set", () => {
    const out = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/timeline/p1"]}>
        <AppHeader
          suffix="Timeline"
          version="5.0.0"
          operatorApp="timeline"
          appJump={[
            { to: "/admin", label: "Admin" },
            { to: "/client", label: "Klient" },
          ]}
        />
      </MemoryRouter>,
    );
    expect(out).toContain('aria-label="Aplikacje"');
    expect(out).toContain("Admin");
    expect(out).toContain('aria-label="Ustawienia"');
  });

  it("derives app jump chips on tablet when operatorApp is set without appJump", () => {
    const out = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/timeline/p1"]}>
        <AppHeader suffix="Timeline" version="5.0.0" operatorApp="timeline" />
      </MemoryRouter>,
    );
    expect(out).toContain('aria-label="Aplikacje"');
    expect(out).toContain("Admin");
    expect(out).toContain("Klient");
  });

  it("omits embedded OperatorNav on compact mobile — shell owns the bar", () => {
    vi.mocked(useMqMobileCompact).mockReturnValue(true);
    const out = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/timeline/p1"]}>
        <AppHeader
          suffix="Timeline"
          version="5.0.0"
          operatorApp="timeline"
          operatorNavExternal
        />
      </MemoryRouter>,
    );
    expect(out).not.toContain('aria-label="Nawigacja operatora"');
    expect(out).toBe("");
  });

  it("omits embedded OperatorNav on compact mobile without operatorNavExternal", () => {
    vi.mocked(useMqMobileCompact).mockReturnValue(true);
    const out = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/timeline/p1"]}>
        <AppHeader suffix="Timeline" version="5.0.0" operatorApp="timeline" />
      </MemoryRouter>,
    );
    expect(out).not.toContain('aria-label="Nawigacja operatora"');
    expect(out).toContain('data-ss-level="1"');
  });

  it("exposes PL chrome action labels for help, appearance, fullscreen", () => {
    const out = html(
      <AppHeader
        suffix="Timeline"
        appJump={[{ to: "/admin", label: "Admin" }]}
        onHelp={() => {}}
        helpPressed
        onAppearance={() => {}}
        appearancePressed
        onFullscreen={() => {}}
        history={{
          canUndo: false,
          canRedo: true,
          dirty: false,
          onUndo: () => {},
          onRedo: () => {},
          onSave: () => {},
        }}
      />,
    );
    expect(out).toContain('aria-label="Pomoc"');
    expect(out).toContain('aria-label="Wygląd"');
    expect(out).toContain('aria-label="Pełny ekran"');
    expect(out).toContain('aria-label="Ustawienia"');
    expect(out).toContain('aria-label="Ponów"');
    expect(out).toContain('aria-label="Aplikacje"');
  });

  it("keeps action row single-line outside compact mobile", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "AppHeader.module.css"),
      "utf8",
    );
    const actionsBlock = css.match(/\.actions\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(actionsBlock).toContain("flex-wrap: nowrap");
    expect(actionsBlock).toContain("overflow-x: auto");
    expect(actionsBlock).toMatch(/padding-block:\s*1px/);
    const mobileAppJumpBlock =
      css.match(
        /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.appJump a,\s*\n\s*\.appJumpMuted\s*\{([^}]*)\}/,
      )?.[1] ?? "";
    expect(mobileAppJumpBlock).toContain("min-height: var(--ss-touch-min-shell-action)");
  });
});
