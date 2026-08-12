// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormaClipButton } from "./FormaClipButton.js";
import type { FormaClip } from "@stagesync/shared";

describe("FormaClipButton", () => {
  const dummyClip: FormaClip = {
    id: "clip-intro",
    name: "Intro",
    startTicks: 0,
    lengthTicks: 3840,
    kind: "section",
    subsections: [{ name: "Lead In", lengthTicks: 1920 }],
  };

  it("renders clip label and responds to pointer events", () => {
    const onPointerDown = vi.fn();
    const onPointerMove = vi.fn();
    const onPointerUp = vi.fn();

    render(
      <FormaClipButton
        clip={dummyClip}
        selected={true}
        selectedSubsectionIdx={null}
        style={{ left: "0px", width: "200px" }}
        pencilActive={false}
        allowHitZones={true}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />,
    );

    const btn = screen.getByRole("button");
    expect(btn.getAttribute("data-clip-id")).toBe("clip-intro");
    expect(screen.getByText("Intro")).toBeTruthy();

    fireEvent.pointerDown(btn);
    expect(onPointerDown).toHaveBeenCalled();
  });
});
