/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminAccordionCard } from "./AdminAccordionCard.js";

afterEach(() => {
  cleanup();
});

describe("AdminAccordionCard", () => {
  it("on mobile toggles one panel and exposes aria-expanded without chevron", () => {
    const onOpen = vi.fn();
    const { rerender } = render(
      <AdminAccordionCard
        id="a"
        title="Sekcja A"
        ariaLabel="Sekcja A"
        mobile
        openId="a"
        onOpen={onOpen}
      >
        <p>Treść A</p>
      </AdminAccordionCard>,
    );

    const toggle = screen.getByRole("button", { name: /Sekcja A/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Treść A")).toBeTruthy();
    expect(toggle.textContent).not.toMatch(/[▸▾▶▼]/);

    rerender(
      <AdminAccordionCard
        id="a"
        title="Sekcja A"
        ariaLabel="Sekcja A"
        mobile
        openId="b"
        onOpen={onOpen}
      >
        <p>Treść A</p>
      </AdminAccordionCard>,
    );
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Treść A")).toBeNull();

    toggle.click();
    expect(onOpen).toHaveBeenCalledWith("a");
  });

  it("on desktop always shows body without a toggle button", () => {
    render(
      <AdminAccordionCard
        id="a"
        title="Sekcja A"
        ariaLabel="Sekcja A"
        mobile={false}
        openId="b"
        onOpen={() => {}}
      >
        <p>Treść A</p>
      </AdminAccordionCard>,
    );
    expect(screen.queryByRole("button", { name: /Sekcja A/ })).toBeNull();
    expect(screen.getByText("Treść A")).toBeTruthy();
  });
});
