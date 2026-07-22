import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Slider } from "./slider.js";

describe("Slider", () => {
  it("renders a range input with value", () => {
    render(
      <Slider aria-label="Gain" value={-6} min={-24} max={12} onValueChange={() => {}} />,
    );
    const el = screen.getByRole("slider", { name: "Gain" });
    expect(el).toBeTruthy();
    expect((el as HTMLInputElement).value).toBe("-6");
  });

  it("calls onValueChange", () => {
    const onValueChange = vi.fn();
    render(
      <Slider aria-label="Fader" value={0} min={-24} max={12} onValueChange={onValueChange} />,
    );
    fireEvent.change(screen.getByRole("slider"), { target: { value: "3" } });
    expect(onValueChange).toHaveBeenCalledWith(3);
  });

  it("supports disabled", () => {
    render(
      <Slider aria-label="Gain" value={0} disabled onValueChange={() => {}} />,
    );
    expect(screen.getByRole("slider")).toBeDisabled();
  });
});
