// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TouchNudgeBar } from "./TouchNudgeBar.js";

describe("TouchNudgeBar", () => {
  it("renders left and right edges and invokes onAction callback", () => {
    const onAction = vi.fn();

    render(
      <TouchNudgeBar
        clipId="clip-1"
        lane="forma"
        showLeftEdge={true}
        onAction={onAction}
      />,
    );

    const moveRightBtn = screen.getByLabelText("Przesuń w prawo");
    fireEvent.click(moveRightBtn);
    expect(onAction).toHaveBeenCalledWith("move-right");

    const stretchLeftOutBtn = screen.getByLabelText("Wydłuż lewą krawędź");
    fireEvent.click(stretchLeftOutBtn);
    expect(onAction).toHaveBeenCalledWith("stretch-left-out");
  });

  it("hides left edge when showLeftEdge is false", () => {
    const onAction = vi.fn();

    render(
      <TouchNudgeBar
        clipId="clip-1"
        lane="forma"
        showLeftEdge={false}
        onAction={onAction}
      />,
    );

    expect(screen.queryByLabelText("Wydłuż lewą krawędź")).toBeNull();
    expect(screen.getByLabelText("Przesuń w prawo")).toBeTruthy();
  });
});
