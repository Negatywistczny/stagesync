import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  ContextMenuProvider,
  useContextMenu,
  type ContextMenuItem,
} from "./context-menu.js";

function Harness({ items }: { items: ContextMenuItem[] }) {
  const { openAt, close } = useContextMenu();
  return (
    <div>
      <button type="button" onClick={() => openAt({ x: 40, y: 50, items })}>
        Open
      </button>
      <button type="button" onClick={close}>
        Close
      </button>
    </div>
  );
}

describe("ContextMenu", () => {
  it("opens via openAt and shows items", () => {
    const onSelect = vi.fn();
    render(
      <ContextMenuProvider>
        <Harness
          items={[
            { id: "copy", label: "Kopiuj", shortcut: "⌘C", onSelect },
            { type: "separator" },
            { id: "del", label: "Usuń", danger: true, onSelect },
          ]}
        />
      </ContextMenuProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Kopiuj/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Usuń/ })).toBeTruthy();
  });

  it("runs onSelect and closes on item click", () => {
    const onSelect = vi.fn();
    render(
      <ContextMenuProvider>
        <Harness
          items={[{ id: "copy", label: "Kopiuj", onSelect }]}
        />
      </ContextMenuProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Kopiuj/ }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("does not run onSelect when item is disabled", () => {
    const onSelect = vi.fn();
    render(
      <ContextMenuProvider>
        <Harness
          items={[
            { id: "paste", label: "Wklej", disabled: true, onSelect },
          ]}
        />
      </ContextMenuProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Wklej/ }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("closes on Escape", () => {
    render(
      <ContextMenuProvider>
        <Harness
          items={[{ id: "a", label: "A", onSelect: () => undefined }]}
        />
      </ContextMenuProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("throws outside provider", () => {
    expect(() => render(<Harness items={[]} />)).toThrow(
      /ContextMenuProvider/,
    );
  });
});
