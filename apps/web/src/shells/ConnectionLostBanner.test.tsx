/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConnectionLostBanner } from "./ConnectionLostBanner.js";

vi.mock("../lib/desktopBridge.js", () => ({
  canReturnToLauncher: () => false,
  returnToLauncher: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("ConnectionLostBanner", () => {
  it("renders nothing unless disconnected", () => {
    const { container } = render(<ConnectionLostBanner status="connected" />);
    expect(container.firstChild).toBeNull();
  });

  it("announces disconnect as an alert", () => {
    render(<ConnectionLostBanner status="disconnected" />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent ?? "").toMatch(/Utracono połączenie/);
  });
});
