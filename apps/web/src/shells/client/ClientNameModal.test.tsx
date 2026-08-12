// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClientNameModal } from "./ClientNameModal.js";

describe("ClientNameModal", () => {
  it("renders input, updates draft, and submits form", () => {
    const setNameDraft = vi.fn();
    const onSubmit = vi.fn((e) => e.preventDefault());

    render(
      <ClientNameModal
        wsStatus="connected"
        latencyMs={10}
        nameDraft="Kacper"
        setNameDraft={setNameDraft}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Zmień nazwę" })).toBeTruthy();

    const input = screen.getByLabelText("Imię lub nazwa urządzenia");
    fireEvent.change(input, { target: { value: "Nowy Nick" } });
    expect(setNameDraft).toHaveBeenCalledWith("Nowy Nick");

    const saveBtn = screen.getByRole("button", { name: "Zapisz" });
    fireEvent.click(saveBtn);
    expect(onSubmit).toHaveBeenCalled();
  });
});
