// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GeneralSettingsTab } from "./GeneralSettingsTab.js";

describe("GeneralSettingsTab", () => {
  it("renders appearance and clock format options and handles changes", () => {
    const onAppearanceChange = vi.fn();
    const onClockFormatChange = vi.fn();
    const onDeviceNameChange = vi.fn();

    render(
      <GeneralSettingsTab
        appearance={{ theme: "dark", contrast: "normal" }}
        onAppearanceChange={onAppearanceChange}
        clockFormat="bbt"
        onClockFormatChange={onClockFormatChange}
        deviceName="Stage Laptop"
        onDeviceNameChange={onDeviceNameChange}
        deviceNameError={null}
      />,
    );

    expect(screen.getByText("Format zegara")).toBeTruthy();

    const timeRadio = screen.getByLabelText("Format zegara MM:SS.ms");
    fireEvent.click(timeRadio);
    expect(onClockFormatChange).toHaveBeenCalledWith("time");
  });
});
