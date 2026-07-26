/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeviceNameFields } from "./DeviceNameFields.js";

const getStored = vi.fn(() => "Ania");
const setStored = vi.fn((v: string) => v.trim());

vi.mock("../lib/deviceNamePrefs.js", () => ({
  DEVICE_DISPLAY_NAME_MAX: 40,
  getStoredDeviceDisplayName: () => getStored(),
  setStoredDeviceDisplayName: (v: string) => setStored(v),
}));

afterEach(() => {
  cleanup();
  getStored.mockReset();
  setStored.mockReset();
  getStored.mockReturnValue("Ania");
  setStored.mockImplementation((v: string) => v.trim());
});

describe("DeviceNameFields", () => {
  it("labels the device name field", () => {
    render(<DeviceNameFields />);
    expect(screen.getByLabelText("Nazwa urządzenia")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Zapisz nazwę" }),
    ).toBeTruthy();
  });

  it("persists uncontrolled submit and shows status", () => {
    render(<DeviceNameFields />);
    fireEvent.change(screen.getByLabelText("Nazwa urządzenia"), {
      target: { value: "  Bartek  " },
    });
    fireEvent.submit(screen.getByLabelText("Nazwa urządzenia").closest("form")!);
    expect(setStored).toHaveBeenCalledWith("  Bartek  ");
    expect(screen.getByRole("status").textContent).toMatch(/Zapisano/);
  });

  it("forwards controlled edits and shows parent error", () => {
    const onChange = vi.fn();
    render(
      <DeviceNameFields value="X" onChange={onChange} error="Za krótka" />,
    );
    expect(screen.queryByRole("button", { name: "Zapisz nazwę" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Nazwa urządzenia"), {
      target: { value: "XY" },
    });
    expect(onChange).toHaveBeenCalledWith("XY");
    expect(screen.getByRole("alert").textContent).toMatch(/Za krótka/);
    expect(
      screen.getByLabelText("Nazwa urządzenia").getAttribute("aria-invalid"),
    ).toBe("true");
  });
});
