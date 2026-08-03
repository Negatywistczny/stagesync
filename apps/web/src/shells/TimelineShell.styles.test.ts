/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

describe("TimelineShell styles", () => {
  it("keeps client-sized touch-min only for mobile tier", () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "TimelineShell.module.css"),
      "utf8",
    );
    expect(css).toMatch(
      /\.shell\[data-tl-tier="mobile"\]\s*\{[^}]*--ss-touch-min:\s*var\(--ss-touch-min-client\)/,
    );
    expect(css).not.toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.shell\s*\{[^}]*--ss-touch-min:\s*var\(--ss-touch-min-client\)/,
    );
  });

  it("limits compact mobile chrome to two rows (topChrome + single-line toolbar)", () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "TimelineShell.module.css"),
      "utf8",
    );
    expect(css).toMatch(/\.topChrome\s*\{[\s\S]*?flex-direction:\s*column/);
    const topChromeNavBlock =
      css.match(
        /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.topChrome\s*>\s*nav\s*\{([^}]*)\}/,
      )?.[1] ?? "";
    expect(topChromeNavBlock).toContain(
      "max-height: var(--ss-touch-min-shell-action)",
    );
    expect(css).toMatch(
      /\.shell\[data-tl-tier="mobile"\]\s+\.toolbarHeaderActions\s*\{/,
    );
    const mobileToolbar =
      css.match(
        /\.shell\[data-tl-tier="mobile"\]\s+\.toolbar\s*\{([^}]*)\}/,
      )?.[1] ?? "";
    expect(mobileToolbar).toContain("flex-wrap: nowrap");
    expect(mobileToolbar).toContain("overflow-x: auto");
    const mobileSong =
      css.match(
        /\.shell\[data-tl-tier="mobile"\]\s+\.songCluster\s*\{([^}]*)\}/,
      )?.[1] ?? "";
    expect(mobileSong).not.toContain("flex: 1 1 100%");
  });

  it("hides edit toolbar on mobile tier and keeps grid for tablet/desktop", () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "TimelineShell.module.css"),
      "utf8",
    );
    expect(css).toMatch(
      /\.shell\[data-tl-tier="mobile"\]\s+\.toolBar[\s\S]*?display:\s*none/,
    );
    expect(css).toMatch(/\.toolbar\s*\{[\s\S]*?grid-template-areas:\s*"tools center song"/);
    expect(css).not.toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.toolbar\s*\{[\s\S]*?display:\s*flex/,
    );
  });

  it("places tablet clip nudge tools on both sides with smaller stretch buttons", () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "TimelineShell.module.css"),
      "utf8",
    );
    expect(css).toMatch(
      /\.touchNudge\s*\{[^}]*pointer-events:\s*none/,
    );
    expect(css).toMatch(
      /\.touchNudgeEdge\s*\{[^}]*flex-direction:\s*column/,
    );
    expect(css).toMatch(
      /\.touchNudgeStretch\s*\{[^}]*flex-direction:\s*row/,
    );
    expect(css).toMatch(
      /\.touchNudgeStretchBtn\s*\{[^}]*--ss-touch-min:\s*var\(--ss-space-8\)/,
    );
    expect(css).not.toMatch(/\.touchNudgeSep\s*\{/);
    expect(css).not.toMatch(
      /\.touchNudge\s*\{[^}]*transform:\s*translateX\(-50%\)/,
    );
  });

  it("keeps Play accent border present in the default state", () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "TimelineShell.module.css"),
      "utf8",
    );
    const playAccent =
      css.match(/\.playAccent\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(playAccent).toMatch(
      /border:\s*1px\s+solid\s+var\(--ss-color-primary\)/,
    );
  });

  it("insets toolbar scroll clusters so icon button borders are not clipped", () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "TimelineShell.module.css"),
      "utf8",
    );
    const sharedCluster =
      css.match(
        /\.toolBar,\s*\.toolbarCenter,\s*\.transport\s*\{([^}]*)\}/,
      )?.[1] ?? "";
    expect(sharedCluster).toMatch(/padding-block:\s*1px/);
    expect(css).toMatch(/\.toolBar\s*\{[^}]*overflow-x:\s*auto/);
    expect(css).toMatch(/\.transport\s*\{[^}]*overflow-x:\s*auto/);
    const songCluster =
      css.match(/\.songCluster\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(songCluster).toMatch(/padding-block:\s*1px/);
    expect(songCluster).toMatch(/overflow-x:\s*auto/);
    const transportExtras =
      css.match(/\.transportExtras\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(transportExtras).toMatch(/padding-block:\s*1px/);
  });

  it("audio clips fill lane height like Forma (absolute top/bottom)", () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "TimelineShell.module.css"),
      "utf8",
    );
    const audioClip = css.match(/\.audioClip\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(audioClip).toMatch(/position:\s*absolute/);
    expect(audioClip).toMatch(
      /top:\s*calc\(var\(--ss-space-1\)\s*\*\s*var\(--tl-zoom-ui\)\)/,
    );
    expect(audioClip).toMatch(
      /bottom:\s*calc\(var\(--ss-space-1\)\s*\*\s*var\(--tl-zoom-ui\)\)/,
    );
    const formaClip = css.match(/\.formaClip\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(formaClip).toMatch(/position:\s*absolute/);
    expect(formaClip).toMatch(
      /top:\s*calc\(var\(--ss-space-1\)\s*\*\s*var\(--tl-zoom-ui\)\)/,
    );
  });
});
