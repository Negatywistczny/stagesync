/**
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("ServerSettingsModal styles", () => {
  const css = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "ServerSettingsModal.module.css",
    ),
    "utf8",
  );

  it("keeps preference tabs on one scrollable row", () => {
    const tabsBlock = css.match(/\.tabs\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(tabsBlock).toContain("flex-wrap: nowrap");
    expect(tabsBlock).toContain("overflow-x: auto");
    expect(tabsBlock).toMatch(/flex:\s*0\s+0\s+auto|flex-shrink:\s*0/);
    expect(css).toMatch(
      /\.tabs :global\(\.ss-btn\)\s*\{[^}]*white-space:\s*nowrap/,
    );
  });

  it("reserves gutter so scrollbars do not overlap inputs on phone", () => {
    const scrollBlock = css.match(/\.scroll\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(scrollBlock).toContain("scrollbar-gutter: stable");
    expect(css).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.scroll\s*\{[^}]*padding-inline-end:/,
    );
  });

  it("uses sidebar tabs and wider panel from tablet landscape up", () => {
    expect(css).toMatch(/@media\s*\(min-width:\s*769px\)/);
    expect(css).toMatch(
      /@media\s*\(min-width:\s*769px\)\s*\{[\s\S]*?\.layout\s*\{[^}]*grid-template-columns:/,
    );
    expect(css).toMatch(
      /@media\s*\(min-width:\s*769px\)\s*\{[\s\S]*?\.tabs\s*\{[^}]*flex-direction:\s*column/,
    );
    expect(css).toMatch(
      /@media\s*\(min-width:\s*769px\)\s*\{[\s\S]*?\.panel\s*\{[^}]*width:\s*min\(48rem/,
    );
  });

  it("keeps a fixed desktop panel size across preference tabs", () => {
    const desktopPanel =
      css.match(
        /@media\s*\(min-width:\s*769px\)\s*\{[\s\S]*?\.panel\s*\{([^}]*)\}/,
      )?.[1] ?? "";
    expect(desktopPanel).toContain("min-width: min(48rem, 100%)");
    expect(desktopPanel).toContain("height: min(85dvh, 44rem)");
    expect(desktopPanel).toContain("min-height: min(85dvh, 44rem)");
    expect(css).toMatch(
      /@media\s*\(min-width:\s*1025px\)\s*\{[\s\S]*?\.panel\s*\{[^}]*min-width:\s*min\(52rem/,
    );
  });

  it("keeps preference tabs visible while scrolling on phone", () => {
    const tabsBlock = css.match(/\.tabs\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(tabsBlock).toContain("position: sticky");
    expect(tabsBlock).toContain("top: 0");
  });
});
