/**
 * @vitest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ShellIconButton } from "./ShellIconButton.js";

describe("ShellIconButton", () => {
  it("wires aria-label, title, and aria-pressed via Button iconOnly", () => {
    const out = renderToStaticMarkup(
      <ShellIconButton label="Pomoc" pressed>
        ?
      </ShellIconButton>,
    );
    expect(out).toContain("ss-btn");
    expect(out).toContain("ss-btn--icon");
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

  it("applies confirming and danger classes", () => {
    const out = renderToStaticMarkup(
      <ShellIconButton label="Wyłącz" confirming danger>
        Off
      </ShellIconButton>,
    );
    expect(out).toContain("confirming");
    expect(out).toContain("danger");
    expect(out).not.toContain("aria-pressed");
  });

  it("pins shell icon geometry to shared action token", () => {
    const css = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "ShellIconButton.module.css",
      ),
      "utf8",
    );
    expect(css).toMatch(/--ss-touch-min:\s*var\(--ss-touch-min-shell-action\)/);
  });

  it("keeps a muted border in the default state (not hover-only)", () => {
    const css = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "ShellIconButton.module.css",
      ),
      "utf8",
    );
    const shellIconBlock = css.match(/\.shellIcon\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(shellIconBlock).toMatch(
      /border:\s*1px\s+solid\s+var\(--ss-color-border\)/,
    );
    expect(shellIconBlock).not.toMatch(
      /border:\s*none|border-color:\s*transparent/,
    );
    expect(css).toMatch(
      /\.shellIcon:hover:not\(:disabled\)\s*\{[^}]*border-color:\s*var\(--ss-color-primary\)/,
    );
    expect(css).toMatch(
      /\.shellIcon\[aria-disabled="true"\]\s*\{[^}]*border-color:\s*var\(--ss-color-border-muted\)/,
    );
  });
});
