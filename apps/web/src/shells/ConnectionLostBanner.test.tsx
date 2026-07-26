/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConnectionLostBanner } from "./ConnectionLostBanner.js";

const canReturn = vi.fn(() => false);
const returnToLauncher = vi.fn(async () => undefined);

vi.mock("../lib/desktopBridge.js", () => ({
  canReturnToLauncher: () => canReturn(),
  returnToLauncher: () => returnToLauncher(),
}));

afterEach(() => {
  cleanup();
  canReturn.mockReset();
  returnToLauncher.mockReset();
  canReturn.mockReturnValue(false);
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
  });
});
