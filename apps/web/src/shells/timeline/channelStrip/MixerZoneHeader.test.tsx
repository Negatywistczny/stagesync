// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MixerZoneHeader } from "./MixerZoneHeader.js";

describe("MixerZoneHeader", () => {
  it("renders title, eye toggle and handles add button click", () => {
    const onToggle = vi.fn();
    const onAdd = vi.fn();

    render(
      <MixerZoneHeader
        title="Busses"
        visible={true}
        onToggle={onToggle}
        addAriaLabel="Dodaj szynę"
        onAdd={onAdd}
        addDisabled={false}
      />,
    );

    expect(screen.getByText("Busses")).toBeTruthy();

    const addBtn = screen.getByRole("button", { name: "Dodaj szynę" });
    fireEvent.click(addBtn);
    expect(onAdd).toHaveBeenCalled();
  });
});
