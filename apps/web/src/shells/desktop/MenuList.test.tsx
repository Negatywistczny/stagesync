// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MenuList } from "./MenuList.js";
import type { DesktopMenuLeaf } from "@lib/client/desktopHtmlMenuModel.js";

describe("MenuList", () => {
  const dummyItems: DesktopMenuLeaf[] = [
    {
      kind: "action",
      id: "action-1",
      label: "Otwórz",
      shortcut: "Ctrl+O",
    },
    {
      kind: "separator",
      id: "sep-1",
    },
    {
      kind: "submenu",
      id: "sub-1",
      label: "Eksportuj",
      items: [
        {
          kind: "action",
          id: "sub-action-1",
          label: "Do PDF",
        },
      ],
    },
    {
      kind: "action",
      id: "action-2",
      label: "Zablokowana opcja",
      disabled: true,
    },
  ];

  it("renders menu items and triggers onPick on click", () => {
    const onPick = vi.fn();
    const onActiveIndexChange = vi.fn();
    const onSubmenuChange = vi.fn();
    const onNestedActiveIndexChange = vi.fn();

    render(
      <MenuList
        items={dummyItems}
        onPick={onPick}
        listClassName="test-list"
        activeIndex={0}
        onActiveIndexChange={onActiveIndexChange}
        submenuId={null}
        submenuAnchor={null}
        onSubmenuChange={onSubmenuChange}
        nestedActiveIndex={-1}
        onNestedActiveIndexChange={onNestedActiveIndexChange}
      />,
    );

    const openButton = screen.getByRole("menuitem", { name: /Otwórz/i });
    expect(openButton).toBeTruthy();

    fireEvent.click(openButton);
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "action-1" }),
    );
  });

  it("handles keyboard navigation (ArrowDown, ArrowUp, Enter)", () => {
    const onPick = vi.fn();
    const onActiveIndexChange = vi.fn();
    const onSubmenuChange = vi.fn();
    const onNestedActiveIndexChange = vi.fn();

    render(
      <MenuList
        items={dummyItems}
        onPick={onPick}
        listClassName="test-list"
        activeIndex={0}
        onActiveIndexChange={onActiveIndexChange}
        submenuId={null}
        submenuAnchor={null}
        onSubmenuChange={onSubmenuChange}
        nestedActiveIndex={-1}
        onNestedActiveIndexChange={onNestedActiveIndexChange}
      />,
    );

    window.dispatchEvent(
      new CustomEvent("stagesync:menu-key", {
        detail: { key: "ArrowDown", preventDefault: vi.fn() },
      }),
    );
    expect(onActiveIndexChange).toHaveBeenCalledWith(1);

    window.dispatchEvent(
      new CustomEvent("stagesync:menu-key", {
        detail: { key: "ArrowUp", preventDefault: vi.fn() },
      }),
    );
    expect(onActiveIndexChange).toHaveBeenCalled();

    window.dispatchEvent(
      new CustomEvent("stagesync:menu-key", {
        detail: { key: "Enter", preventDefault: vi.fn() },
      }),
    );
    expect(onPick).toHaveBeenCalled();
  });
});
