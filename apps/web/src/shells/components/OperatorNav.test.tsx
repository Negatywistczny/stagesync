/**
 * @vitest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/operatorSurface.js", () => ({
  shouldShowOperatorNav: vi.fn(() => true),
}));

vi.mock("../../lib/useMqMobileCompact.js", () => ({
  useMqMobileCompact: vi.fn(() => false),
}));

vi.mock("../../lib/useMqTablet.js", () => ({
  useMqTablet: vi.fn(() => true),
}));

vi.mock("../../lib/operatorNavShortcuts.js", () => ({
  useOperatorNavShortcuts: vi.fn(),
}));

vi.mock("../../lib/lastTimelineProject.js", () => ({
  getLastTimelineProjectId: vi.fn(() => "proj-1"),
}));

import { OperatorNav } from "./OperatorNav.js";
import { useMqMobileCompact } from "../../lib/useMqMobileCompact.js";

function html(node: React.ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
}

describe("OperatorNav", () => {
  afterEach(() => {
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
    expect(compactBlock).toContain("height: var(--ss-touch-min-client)");
    expect(css).not.toMatch(
      /\.compact\s+\.segments\s*\{[^}]*min-width:\s*calc\(/,
    );
    const selectBlock =
      css.match(
        /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.sectionSelectInput\s*\{([^}]*)\}/,
      )?.[1] ?? "";
    expect(selectBlock).toContain("min-height: var(--ss-touch-min)");
    expect(selectBlock).toContain("max-height: var(--ss-touch-min)");
  });
});
