/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppCrashFallback } from "./AppCrashFallback.js";

afterEach(() => {
  cleanup();
});

describe("AppCrashFallback", () => {
  it("exposes Polish navigation aria-labels", () => {
    render(<AppCrashFallback error={new Error("x")} />);
    expect(screen.getByRole("button", { name: "Odśwież stronę" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Przejdź do Client" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Przejdź do Admin" })).toBeTruthy();
  });
});
