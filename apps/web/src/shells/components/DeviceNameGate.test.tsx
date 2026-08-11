/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeviceNameGate } from "./DeviceNameGate.js";

vi.mock("../../transport/useTransport.js", () => ({
  useTransport: () => ({
    wsStatus: "connected",
    latencyMs: 8,
  }),
}));

vi.mock("@lib/client/desktopBridge.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@lib/client/desktopBridge.js")>();
  return {
    ...actual,
    canReturnToLauncher: () => false,
    returnToLauncher: vi.fn(),
  };
});

const getStored = vi.fn(() => null as string | null);
const setStored = vi.fn((v: string) => v.trim());

vi.mock("@lib/client/deviceNamePrefs.js", () => ({
  DEVICE_DISPLAY_NAME_MAX: 40,
  getStoredDeviceDisplayName: () => getStored(),
  setStoredDeviceDisplayName: (v: string) => setStored(v),
}));

afterEach(() => {
  cleanup();
  getStored.mockReset();
  setStored.mockReset();
  getStored.mockReturnValue(null);
  setStored.mockImplementation((v: string) => v.trim());
});

describe("DeviceNameGate", () => {
  it("presents labelled dialog when no stored name", () => {
    render(
      <DeviceNameGate>
        <div>app</div>
      </DeviceNameGate>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-labelledby")).toBe("device-name-title");
    const title = screen.getByRole("heading", { name: "Witaj w StageSync" });
    expect(title.getAttribute("id")).toBe("device-name-title");
    const sync = title.querySelector("[class*='brandSync']");
    expect(sync?.textContent).toBe("Sync");
    expect(screen.getByLabelText("Imię lub nazwa urządzenia")).toBeTruthy();
    expect(screen.queryByText("app")).toBeNull();
  });

  it("renders children when name already stored", () => {
    getStored.mockReturnValue("Ania");
    render(
      <DeviceNameGate>
        <div>app</div>
      </DeviceNameGate>,
    );
    expect(screen.getByText("app")).toBeTruthy();
  });

  it("stores name on submit and unlocks", () => {
    render(
      <DeviceNameGate>
        <div>app</div>
      </DeviceNameGate>,
    );
    fireEvent.change(screen.getByLabelText("Imię lub nazwa urządzenia"), {
      target: { value: "  Ania  " },
    });
    fireEvent.submit(
      screen.getByLabelText("Imię lub nazwa urządzenia").closest("form")!,
    );
    expect(setStored).toHaveBeenCalledWith("  Ania  ");
    expect(screen.getByText("app")).toBeTruthy();
  });
});
