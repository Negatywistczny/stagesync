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

function html(node: React.ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
}

describe("OperatorNav", () => {
  afterEach(() => {
    vi.clearAllMocks();
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
});
