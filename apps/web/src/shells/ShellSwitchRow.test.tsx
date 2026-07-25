import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShellSwitchRow } from "./ShellSwitchRow.js";

describe("ShellSwitchRow", () => {
  it("wraps checkbox and label text for SR association", () => {
    const out = renderToStaticMarkup(
      <ShellSwitchRow checked onChange={() => {}}>
        Animacje
      </ShellSwitchRow>,
    );
    expect(out).toContain("type=\"checkbox\"");
    expect(out).toContain("role=\"switch\"");
    expect(out).toContain("aria-checked=\"true\"");
    expect(out).toContain("Animacje");
    expect(out).toContain("checked");
  });
});
