/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./AppCrashFallback.js", () => ({
  AppCrashFallback: ({ error }: { error: unknown }) => (
    <div role="alert">{String((error as Error).message)}</div>
  ),
}));

import { AppErrorBoundary } from "./AppErrorBoundary.js";

afterEach(() => {
  cleanup();
});

function Boom(): never {
  throw new Error("render boom");
}

describe("AppErrorBoundary", () => {
  it("renders children when healthy", () => {
    render(
      <AppErrorBoundary>
        <p>ok</p>
      </AppErrorBoundary>,
    );
    expect(screen.getByText("ok")).toBeTruthy();
  });

  it("shows AppCrashFallback after a child render throw", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole("alert").textContent).toBe("render boom");
    spy.mockRestore();
  });
});
