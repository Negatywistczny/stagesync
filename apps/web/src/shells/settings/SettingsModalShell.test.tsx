// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsModalShell } from "./SettingsModalShell.js";

describe("SettingsModalShell", () => {
  it("renders title, children, and triggers onDiscard", () => {
    const onDiscard = vi.fn();

    render(
      <SettingsModalShell
        title="Ustawienia ogólne"
        footer={<button>Zapisz</button>}
        onDiscard={onDiscard}
      >
        <p>Zawartość panelu</p>
      </SettingsModalShell>,
    );

    expect(screen.getByText("Ustawienia ogólne")).toBeTruthy();
    expect(screen.getByText("Zawartość panelu")).toBeTruthy();
    expect(screen.getByText("Zapisz")).toBeTruthy();

    const closeButtons = screen.getAllByRole("button", { name: "Odrzuć" });
    fireEvent.click(closeButtons[0]!);
    expect(onDiscard).toHaveBeenCalled();
  });
});
