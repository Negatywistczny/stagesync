/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigateTo = vi.fn();

vi.mock("react-router-dom", () => ({
  Navigate: ({ to }: { to: string }) => {
    navigateTo(to);
    return <div data-testid="navigate">{to}</div>;
  },
}));

vi.mock("./ClientShell.js", () => ({
  ClientShell: () => <div data-testid="client">Client</div>,
}));

const isDesktopShell = vi.fn();

vi.mock("../lib/desktopBridge.js", () => ({
  isDesktopShell: () => isDesktopShell(),
}));

import { DesktopRootRedirect } from "./DesktopRootRedirect.js";

afterEach(() => {
  cleanup();
  navigateTo.mockClear();
  isDesktopShell.mockReset();
});

describe("DesktopRootRedirect", () => {
  it("sends desktop shell to Admin", () => {
    isDesktopShell.mockReturnValue(true);
    render(<DesktopRootRedirect />);
    expect(screen.getByTestId("navigate").textContent).toBe("/admin");
  });

  it("renders ClientShell in the browser", () => {
    isDesktopShell.mockReturnValue(false);
    render(<DesktopRootRedirect />);
    expect(screen.getByTestId("client")).toBeTruthy();
  });
});
