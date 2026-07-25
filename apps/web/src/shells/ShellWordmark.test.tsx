/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShellWordmark } from "./ShellWordmark.js";

afterEach(() => {
  cleanup();
});

describe("ShellWordmark", () => {
  it("labels static logo with StageSync brand", () => {
    render(<ShellWordmark />);
    expect(screen.getByRole("img", { name: "StageSync" })).toBeTruthy();
  });

  it("includes shell suffix in brand label", () => {
    render(<ShellWordmark suffix="Admin" />);
    expect(screen.getByRole("img", { name: "StageSync Admin" })).toBeTruthy();
  });


  it("falls back to brand label when clickable without title", () => {
    render(<ShellWordmark onClick={() => {}} suffix="Client" />);
    expect(
      screen.getByRole("button", { name: "StageSync Client" }),
    ).toBeTruthy();
  });

  it("uses button aria-label when clickable", () => {
    const onClick = vi.fn();
    render(<ShellWordmark onClick={onClick} title="Wróć do ról" />);
    expect(screen.getByRole("button", { name: "Wróć do ról" })).toBeTruthy();
  });
});
