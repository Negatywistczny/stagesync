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
});
