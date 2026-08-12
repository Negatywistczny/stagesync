// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimelineRulerView } from "./TimelineRulerView.js";

describe("TimelineRulerView", () => {
  it("renders eye button, bar marks, and toggles eye visibility menu", () => {
    const setEyeOpen = vi.fn();
    const eyeBtnRef = { current: null };

    render(
      <TimelineRulerView
        eyeBtnRef={eyeBtnRef}
        eyeOpen={false}
        eyeMenuId="eye-menu"
        setEyeOpen={setEyeOpen}
        touchTier="desktop"
        beginDockWidthResize={vi.fn()}
        onDockWidthResizePointerMove={vi.fn()}
        endDockWidthResize={vi.fn()}
        viewSpan={{ start: 0, end: 3840 }}
        barTicks={1920}
        effectiveZoomH={1}
        loopRange={{ startTicks: 0, endTicks: 1920 }}
        loopOn={true}
        barMarks={[
          { ticks: 0, label: "1" },
          { ticks: 1920, label: "2" },
        ]}
        rulerBeatMarks={[]}
        onLocatorPointerDown={vi.fn()}
        onLocatorPointerMove={vi.fn()}
        onLocatorPointerUp={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Widoczność ścieżek" }),
    ).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();

    const eyeBtn = screen.getByRole("button", { name: "Widoczność ścieżek" });
    fireEvent.click(eyeBtn);
    expect(setEyeOpen).toHaveBeenCalled();
  });
});
