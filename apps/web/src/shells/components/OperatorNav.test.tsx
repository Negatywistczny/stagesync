/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@lib/shell-operator/operatorSurface.js", () => ({
  shouldShowOperatorNav: vi.fn(() => true),
}));

vi.mock("@lib/client/useMqMobileCompact.js", () => ({
  useMqMobileCompact: vi.fn(() => false),
}));

vi.mock("@lib/client/useMqTablet.js", () => ({
  useMqTablet: vi.fn(() => true),
}));

vi.mock("@lib/shell-operator/operatorNavShortcuts.js", () => ({
  useOperatorNavShortcuts: vi.fn(),
}));

vi.mock("@lib/client/lastTimelineProject.js", () => ({
  getLastTimelineProjectId: vi.fn(() => "proj-1"),
}));

vi.mock("@lib/client/preferencesEvents.js", () => ({
  openPreferences: vi.fn(),
}));

import { openPreferences } from "@lib/client/preferencesEvents.js";
import { OperatorNav } from "./OperatorNav.js";
import { useMqMobileCompact } from "@lib/client/useMqMobileCompact.js";

function html(node: React.ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
}

describe("OperatorNav", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.mocked(useMqMobileCompact).mockReturnValue(false);
  });

  it("renders app segments and admin sections on tablet", () => {
    const out = html(
      <OperatorNav
        activeApp="admin"
        section="songs"
        onSectionChange={() => {}}
      />,
    );
    expect(out).toContain("Admin");
    expect(out).toContain("Timeline");
    expect(out).toContain("Klient");
    expect(out).toContain("Utwory");
    expect(out).toContain('aria-label="Nawigacja operatora"');
  });

  it("marks timeline segment selected", () => {
    const out = html(<OperatorNav activeApp="timeline" />);
    expect(out).toContain("Timeline");
    expect(out).toContain('aria-current="page"');
  });

  it("renders center slot before settings on compact", () => {
    vi.mocked(useMqMobileCompact).mockReturnValue(true);
    const out = html(
      <OperatorNav activeApp="timeline" center="Mój utwór" />,
    );
    expect(out.indexOf("Admin")).toBeLessThan(out.indexOf("Mój utwór"));
    expect(out.indexOf("Mój utwór")).toBeLessThan(out.indexOf("Ustawienia"));
    expect(out).toContain('aria-label="Aplikacje"');
  });

  it("keeps admin segments left of section select on compact", () => {
    vi.mocked(useMqMobileCompact).mockReturnValue(true);
    const out = html(
      <OperatorNav
        activeApp="admin"
        section="songs"
        onSectionChange={() => {}}
      />,
    );
    expect(out.indexOf("Admin")).toBeLessThan(out.indexOf("Utwory"));
    expect(out.indexOf("Utwory")).toBeLessThan(out.indexOf("Ustawienia"));
  });

  it("opens preferences from settings gear (admin → general tab)", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <OperatorNav activeApp="admin" section="songs" onSectionChange={() => {}} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ustawienia" }));
    expect(openPreferences).toHaveBeenCalledWith("general");
  });

  it("opens preferences from settings gear (timeline — no tab)", () => {
    render(
      <MemoryRouter initialEntries={["/timeline/p1"]}>
        <OperatorNav activeApp="timeline" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ustawienia" }));
    expect(openPreferences).toHaveBeenCalledWith(undefined);
  });

  it("does not open admin preferences from settings gear (client default)", () => {
    render(
      <MemoryRouter initialEntries={["/client"]}>
        <OperatorNav activeApp="client" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ustawienia" }));
    expect(openPreferences).not.toHaveBeenCalled();
  });

  it("calls custom onSettings instead of openPreferences", () => {
    const onSettings = vi.fn();
    render(
      <MemoryRouter initialEntries={["/client"]}>
        <OperatorNav
          activeApp="client"
          onSettings={onSettings}
          settingsLabel="Ustawienia globalne"
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ustawienia globalne" }));
    expect(onSettings).toHaveBeenCalledOnce();
    expect(openPreferences).not.toHaveBeenCalled();
  });

  it("uses shrinkable compact grid and touch-min section select height", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const css = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "OperatorNav.module.css",
      ),
      "utf8",
    );
    const compactBlock =
      css.match(/\.compact\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(compactBlock).toContain(
      "grid-template-columns: minmax(0, max-content) minmax(0, 1fr) minmax(0, max-content)",
    );
    expect(compactBlock).toContain("overflow: hidden");
    expect(compactBlock).toContain("height: var(--ss-touch-min-shell-action)");
    expect(css).not.toMatch(
      /\.compact\s+\.segments\s*\{[^}]*min-width:\s*calc\(/,
    );
    const selectBlock =
      css.match(
        /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.sectionSelectInput\s*\{([^}]*)\}/,
      )?.[1] ?? "";
    expect(selectBlock).toContain("min-height: var(--ss-touch-min-shell-action)");
    expect(selectBlock).toContain("max-height: var(--ss-touch-min-shell-action)");
  });
});
