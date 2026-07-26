/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OperatorPinGate } from "./OperatorPinGate.js";

vi.mock("../transport/useTransport.js", () => ({
  useTransport: () => ({
    state: { playing: false },
    wsStatus: "connected",
    latencyMs: 12,
  }),
}));

vi.mock("../lib/operatorPin.js", () => ({
  fetchOperatorPinRequired: vi.fn(async () => true),
  getStoredOperatorPin: vi.fn(() => null),
  unlockOperatorPin: vi.fn(),
}));

vi.mock("../lib/desktopBridge.js", () => ({
  canReturnToLauncher: () => false,
  returnToLauncher: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("OperatorPinGate", () => {
  it("presents labelled dialog when PIN is required", async () => {
    render(
      <OperatorPinGate>
        <div>secret</div>
      </OperatorPinGate>,
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog.getAttribute("aria-labelledby")).toBe("operator-pin-title");
    expect(
      screen.getByRole("heading", { name: "PIN operatora" }).getAttribute("id"),
    ).toBe("operator-pin-title");
    expect(screen.getByPlaceholderText("PIN").getAttribute("aria-label")).toBe(
      "PIN operatora",
    );
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("renders children when PIN is not required", async () => {
    const { fetchOperatorPinRequired } = await import("../lib/operatorPin.js");
    vi.mocked(fetchOperatorPinRequired).mockResolvedValueOnce(false);

    render(
      <OperatorPinGate>
        <div>secret</div>
      </OperatorPinGate>,
    );

    await waitFor(() => {
      expect(screen.getByText("secret")).toBeTruthy();
    });
  });
});
