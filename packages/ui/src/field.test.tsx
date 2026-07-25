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

  it("surfaces field errors as alerts and hides hint", () => {
    render(
      <Field label="PIN" htmlFor="pin" hint="4 cyfry" error="Za krótki">
        <Input id="pin" />
      </Field>,
    );
    expect(screen.getByRole("alert").textContent).toBe("Za krótki");
    expect(screen.queryByText("4 cyfry")).toBeNull();
  });
});

describe("Badge", () => {
  it("renders ss-badge", () => {
    render(<Badge>meta</Badge>);
    expect(screen.getByText("meta")).toHaveClass("ss-badge");
  });

  it("merges className and forwards aria attributes", () => {
    render(
      <Badge className="extra" aria-label="Metadane">
        BPM
      </Badge>,
    );
    const el = screen.getByLabelText("Metadane");
    expect(el).toHaveClass("ss-badge");
    expect(el).toHaveClass("extra");
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
    expect(screen.getByRole("group", { name: "mode" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "A" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    screen.getByRole("button", { name: "B" }).click();
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("honors disabled options and option aria-labels", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        value="live"
        onChange={onChange}
        options={[
          { value: "live", label: "Live", "aria-label": "Tryb live" },
          {
            value: "edit",
            label: "Edit",
            disabled: true,
            "aria-label": "Tryb edycji",
          },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "Tryb live" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const edit = screen.getByRole("button", { name: "Tryb edycji" });
    expect(edit).toBeDisabled();
    edit.click();
    expect(onChange).not.toHaveBeenCalled();
  });
});
