import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "./badge.js";
import { Field, Input, Select, Textarea } from "./field.js";
import { SegmentedControl } from "./segmented.js";

describe("Field / Input", () => {
  it("renders input with ss-input and field chrome", () => {
    render(
      <Field label="Nazwa" htmlFor="n" hint="opcjonalne">
        <Input id="n" />
      </Field>,
    );
    expect(screen.getByLabelText("Nazwa")).toHaveClass("ss-input");
    expect(screen.getByText("opcjonalne")).toBeInTheDocument();
  });

  it("renders select and textarea classes", () => {
    const { container } = render(
      <>
        <Select aria-label="s">
          <option value="a">A</option>
        </Select>
        <Textarea aria-label="t" />
      </>,
    );
    expect(container.querySelector(".ss-select")).toBeTruthy();
    expect(container.querySelector(".ss-textarea")).toBeTruthy();
  });
});

describe("Badge", () => {
  it("renders ss-badge", () => {
    render(<Badge>meta</Badge>);
    expect(screen.getByText("meta")).toHaveClass("ss-badge");
  });
});

describe("SegmentedControl", () => {
  it("marks selected and calls onChange", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        aria-label="mode"
        value="a"
        onChange={onChange}
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "A" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    screen.getByRole("button", { name: "B" }).click();
    expect(onChange).toHaveBeenCalledWith("b");
  });
});
