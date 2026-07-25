/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ShellAlertDialog,
  ShellConfirmDialog,
  ShellPromptDialog,
} from "./ShellBlockingDialog.js";

afterEach(() => {
  cleanup();
});

function panelCancel(): HTMLElement {
  return screen
    .getAllByRole("button", { name: "Anuluj" })
    .find((el) => el.classList.contains("ss-btn"))!;
}

function tab(shiftKey = false) {
  fireEvent.keyDown(document, {
    key: "Tab",
    code: "Tab",
    shiftKey,
    bubbles: true,
  });
}

describe("ShellBlockingDialog focus trap", () => {
  it("wraps Tab at panel edges and restores focus on close", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const opener = document.createElement("button");
    opener.textContent = "open";
    document.body.appendChild(opener);
    opener.focus();

    const { rerender } = render(
      <ShellConfirmDialog
        open
        title="Usunąć?"
        message="Tej operacji nie da się cofnąć."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const cancel = panelCancel();
    const ok = screen.getByRole("button", { name: "Potwierdź" });
    // Initial focus prefers primary (.ss-btn--primary).
    expect(document.activeElement).toBe(ok);

    // Last → Tab wraps to first (jsdom has no native tab order).
    tab();
    expect(document.activeElement).toBe(cancel);

    // First → Shift+Tab wraps to last.
    tab(true);
    expect(document.activeElement).toBe(ok);

    fireEvent.keyDown(document, { key: "Escape", bubbles: true });
    expect(onCancel).toHaveBeenCalledOnce();

    rerender(
      <ShellConfirmDialog
        open={false}
        title="Usunąć?"
        message="Tej operacji nie da się cofnąć."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("wraps Tab from last action back to prompt input", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ShellPromptDialog
        open
        title="Nowy utwór"
        label="Nazwa"
        defaultValue="Demo"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const input = screen.getByLabelText("Nazwa");
    const create = screen.getByRole("button", { name: "Utwórz" });
    expect(document.activeElement).toBe(input);

    create.focus();
    tab();
    expect(document.activeElement).toBe(input);

    tab(true);
    expect(document.activeElement).toBe(create);
  });

  it("Escape on alert calls onClose", () => {
    const onClose = vi.fn();
    render(
      <ShellAlertDialog open title="Błąd" message="Coś poszło nie tak." onClose={onClose} />,
    );
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Rozumiem" }),
    );
    fireEvent.keyDown(document, { key: "Escape", bubbles: true });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("ShellConfirmDialog labels", () => {
  it("uses custom confirm and cancel labels", () => {
    render(
      <ShellConfirmDialog
        open
        title="Restart?"
        message="Host zostanie zrestartowany."
        confirmLabel="Restartuj"
        cancelLabel="Zostaw"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Restartuj" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zostaw" })).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Restart?" })).toBeTruthy();
  });
});
