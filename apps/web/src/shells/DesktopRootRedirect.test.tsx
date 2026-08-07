/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigateTo = vi.fn();

vi.mock("react-router", () => ({
  Navigate: ({ to }: { to: string }) => {
    navigateTo(to);
    return <div data-testid="navigate">{to}</div>;
  },
}));

import { DesktopRootRedirect } from "./DesktopRootRedirect.js";

afterEach(() => {
  cleanup();
  navigateTo.mockClear();
});

describe("DesktopRootRedirect", () => {
  it("redirects root to /client", () => {
    render(<DesktopRootRedirect />);
    expect(screen.getByTestId("navigate").textContent).toBe("/client");
  });
});
