/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConnectionLostBanner } from "./ConnectionLostBanner.js";

const canReturn = vi.fn(() => false);
const returnToLauncher = vi.fn(async () => undefined);
const canChange = vi.fn(() => false);
const requestNative = vi.fn(() => false);

vi.mock("../lib/desktopBridge.js", () => ({
  canReturnToLauncher: () => canReturn(),
  returnToLauncher: () => returnToLauncher(),
}));

vi.mock("../lib/nativeShell.js", () => ({
  canChangeServer: () => canChange(),
  requestNativeChangeServer: () => requestNative(),
}));

afterEach(() => {
  cleanup();
  canReturn.mockReset();
  returnToLauncher.mockReset();
  canChange.mockReset();
  requestNative.mockReset();
  canReturn.mockReturnValue(false);
  canChange.mockReturnValue(false);
  requestNative.mockReturnValue(false);
  returnToLauncher.mockResolvedValue(undefined);
});

describe("ConnectionLostBanner", () => {
  it("renders nothing when connected", () => {
    const { container } = render(<ConnectionLostBanner status="connected" />);
    expect(container.firstChild).toBeNull();
  });

  it("announces disconnect as an alert", () => {
    render(<ConnectionLostBanner status="disconnected" />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent ?? "").toMatch(/Utracono połączenie/);
    expect(
      screen.queryByRole("button", {
        name: "Wróć do wyboru hosta w launcherze",
      }),
    ).toBeNull();
  });

  it("shows connecting copy while reconnecting", () => {
    render(<ConnectionLostBanner status="connecting" />);
    expect(screen.getByRole("alert").textContent ?? "").toMatch(/Łączenie/);
  });

  it("offers return-to-launcher when Tauri IPC is available", () => {
    canReturn.mockReturnValue(true);
    render(<ConnectionLostBanner status="disconnected" />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Wróć do wyboru hosta w launcherze",
      }),
    );
    expect(returnToLauncher).toHaveBeenCalled();
    expect(requestNative).toHaveBeenCalled();
  });

  it("prefers Android native changeServer when bridge is present", () => {
    canChange.mockReturnValue(true);
    requestNative.mockReturnValue(true);
    render(<ConnectionLostBanner status="disconnected" />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Wróć do wyboru hosta w launcherze",
      }),
    );
    expect(requestNative).toHaveBeenCalled();
    expect(returnToLauncher).not.toHaveBeenCalled();
  });
});
