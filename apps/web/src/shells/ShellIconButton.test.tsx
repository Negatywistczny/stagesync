import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShellIconButton } from "./ShellIconButton.js";

describe("ShellIconButton", () => {
  it("wires aria-label, title, and aria-pressed", () => {
    const out = renderToStaticMarkup(
      <ShellIconButton label="Pomoc" pressed>
        ?
      </ShellIconButton>,
    );
    expect(out).toContain('aria-label="Pomoc"');
    expect(out).toContain('title="Pomoc"');
    expect(out).toContain('aria-pressed="true"');
  });

  it("omits aria-pressed when unset and forwards controls", () => {
    const out = renderToStaticMarkup(
      <ShellIconButton
        label="Widok"
        aria-expanded={true}
        aria-controls="panel-1"
      >
        V
      </ShellIconButton>,
    );
    expect(out).toContain('aria-label="Widok"');
    expect(out).not.toContain("aria-pressed");
    expect(out).toContain('aria-expanded="true"');
    expect(out).toContain('aria-controls="panel-1"');
  });
});
