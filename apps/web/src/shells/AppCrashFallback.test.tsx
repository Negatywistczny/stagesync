/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", () => ({
  isRouteErrorResponse: (error: unknown) =>
    Boolean(
      error &&
        typeof error === "object" &&
        "status" in error &&
        "statusText" in error,
    ),
}));

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

  it("renders string errors and custom title", () => {
    render(<AppCrashFallback error="Sieć padła" title="Awaria hosta" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Awaria hosta",
    );
    expect(screen.getByText("Sieć padła")).toBeTruthy();
  });

  it("falls back for unknown non-error values", () => {
    render(<AppCrashFallback error={null} />);
    expect(screen.getByText("Nieoczekiwany błąd.")).toBeTruthy();
  });

  it("surfaces route error status data", () => {
    render(
      <AppCrashFallback
        error={{ status: 404, statusText: "Not Found", data: "Brak trasy" }}
      />,
    );
    expect(screen.getByText("Brak trasy")).toBeTruthy();
  });
});
