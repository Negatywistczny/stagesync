/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router-dom", () => ({
  useRouteError: () => new Error("boom"),
}));

vi.mock("./AppCrashFallback.js", () => ({
  AppCrashFallback: ({ error }: { error: unknown }) => (
    <div role="alert">{String((error as Error).message)}</div>
  ),
}));

import { RouteErrorPage } from "./RouteErrorPage.js";

afterEach(() => {
  cleanup();
});

describe("RouteErrorPage", () => {
  it("forwards the route error into AppCrashFallback", () => {
    render(<RouteErrorPage />);
    expect(screen.getByRole("alert").textContent).toBe("boom");
  });
});
