/**
 * @vitest-environment jsdom
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button.js";

const buttonCss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "button.css"),
  "utf8",
);

describe("Button", () => {
  it("renders default state", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("supports disabled", () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("supports loading (blocks interaction)", () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.getAttribute("aria-busy")).toBe("true");
  });

  it("supports selected via aria-pressed", () => {
    render(<Button selected>Toggle</Button>);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("supports iconOnly class", () => {
    render(<Button iconOnly aria-label="Close">×</Button>);
    expect(screen.getByRole("button").className).toContain("ss-btn--icon");
  });

  it("uses --ss-touch-min for min hit height (text and icon)", () => {
    expect(buttonCss).toMatch(/min-height:\s*var\(--ss-touch-min\)/);
    expect(buttonCss).toMatch(
      /\.ss-btn--icon\s*\{[^}]*height:\s*var\(--ss-touch-min\)/s,
    );
  });

  it("supports variants and selected=false aria-pressed", () => {
    const { rerender } = render(<Button variant="ghost">G</Button>);
    expect(screen.getByRole("button").className).toContain("ss-btn--ghost");
    rerender(<Button variant="secondary">S</Button>);
    expect(screen.getByRole("button").className).toContain("ss-btn--secondary");
    rerender(<Button selected={false}>Off</Button>);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("sets aria-disabled when disabled or loading", () => {
    const { rerender } = render(<Button disabled>Save</Button>);
    expect(screen.getByRole("button").getAttribute("aria-disabled")).toBe(
      "true",
    );
    rerender(<Button loading>Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-disabled")).toBe("true");
    expect(
      btn.querySelector(".ss-btn__spinner")?.getAttribute("aria-hidden"),
    ).toBe("true");
  });
});
