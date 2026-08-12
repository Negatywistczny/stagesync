// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimelineStatusFooter } from "./TimelineStatusFooter.js";

describe("TimelineStatusFooter", () => {
  it("renders connection status and handles snap mode and zoom sliders", () => {
    const setSnapMode = vi.fn();
    const setZoomUi = vi.fn();
    const setZoomH = vi.fn();
    const setVerticalZoom = vi.fn();

    render(
      <TimelineStatusFooter
        wsStatus="connected"
        isMobilePreview={false}
        snapMode="bar"
        setSnapMode={setSnapMode}
        zoomUi={100}
        setZoomUi={setZoomUi}
        zoomH={96}
        setZoomH={setZoomH}
        zoomV={64}
        setVerticalZoom={setVerticalZoom}
        timelineSurface="timeline"
      />,
    );

    expect(screen.getByText("Połączony")).toBeTruthy();

    const snapSelect = screen.getByLabelText("Tryb snap");
    fireEvent.change(snapSelect, { target: { value: "beat" } });
    expect(setSnapMode).toHaveBeenCalledWith("beat");

    const zoomHSlider = screen.getByLabelText("Zoom poziomy");
    fireEvent.change(zoomHSlider, { target: { value: "120" } });
    expect(setZoomH).toHaveBeenCalledWith(120);

    const zoomVSlider = screen.getByLabelText("Zoom pionowy");
    fireEvent.change(zoomVSlider, { target: { value: "80" } });
    expect(setVerticalZoom).toHaveBeenCalledWith(80);
  });

  it("disables H and V sliders when in mixer surface", () => {
    const setSnapMode = vi.fn();
    const setZoomUi = vi.fn();
    const setZoomH = vi.fn();
    const setVerticalZoom = vi.fn();

    render(
      <TimelineStatusFooter
        wsStatus="disconnected"
        isMobilePreview={false}
        snapMode="off"
        setSnapMode={setSnapMode}
        zoomUi={100}
        setZoomUi={setZoomUi}
        zoomH={96}
        setZoomH={setZoomH}
        zoomV={64}
        setVerticalZoom={setVerticalZoom}
        timelineSurface="mixer"
      />,
    );

    expect(
      screen.getByLabelText("Zoom poziomy").hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen.getByLabelText("Zoom pionowy").hasAttribute("disabled"),
    ).toBe(true);
  });
});
