// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClientWelcome } from "./ClientWelcome.js";

describe("ClientWelcome", () => {
  it("renders greetings, role tiles and triggers role selection and start", () => {
    const onRoleTileClick = vi.fn();
    const onEditName = vi.fn();
    const onStart = vi.fn();

    render(
      <ClientWelcome
        wsStatus="connected"
        isCompactMobile={false}
        name="Kacper"
        picked={["drums"]}
        onRoleTileClick={onRoleTileClick}
        onEditName={onEditName}
        onStart={onStart}
        chrome={<div>Header</div>}
      />,
    );

    expect(screen.getByText("Cześć, Kacper")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zmień nazwę" })).toBeTruthy();

    const startBtn = screen.getByRole("button", { name: "Rozpocznij" });
    fireEvent.click(startBtn);
    expect(onStart).toHaveBeenCalled();
  });
});
