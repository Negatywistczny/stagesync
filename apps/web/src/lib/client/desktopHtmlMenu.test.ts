/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildHtmlDesktopMenu } from "./desktopHtmlMenuModel.js";
import { handleDesktopMenuShortcut } from "./desktopMenuShortcuts.js";
import { DESKTOP_MENU_EVENT } from "./desktopMenuEvents.js";

describe("buildHtmlDesktopMenu", () => {
  it("starts at Plik without a StageSync top-level item", () => {
    const menus = buildHtmlDesktopMenu([], { canUndo: false, canRedo: false });
    expect(menus.map((m) => m.label)).toEqual([
      "Plik",
      "Edycja",
      "Widok",
      "Odtwarzanie",
      "Host",
      "Pomoc",
    ]);
  });

  it("disables undo/redo from history flags and lists recent projects", () => {
    const menus = buildHtmlDesktopMenu([{ id: "p1", name: "Demo" }], {
      canUndo: true,
      canRedo: false,
    });
    const edit = menus.find((m) => m.id === "edit");
    const undo = edit?.items.find(
      (i) => i.kind === "action" && i.id === "edit_undo",
    );
    const redo = edit?.items.find(
      (i) => i.kind === "action" && i.id === "edit_redo",
    );
    expect(undo && undo.kind === "action" && !undo.disabled).toBe(true);
    expect(redo && redo.kind === "action" && redo.disabled).toBe(true);

    const file = menus.find((m) => m.id === "file");
    const recent = file?.items.find(
      (i) => i.kind === "submenu" && i.id === "file_recent",
    );
    expect(recent?.kind).toBe("submenu");
    if (recent?.kind === "submenu") {
      expect(recent.items[0]).toMatchObject({
        kind: "action",
        action: "navigate:/timeline/p1",
        label: "Demo",
      });
    }
  });

  it("puts Preferencje and Zakończ under Plik", () => {
    const file = buildHtmlDesktopMenu([], {
      canUndo: false,
      canRedo: false,
    }).find((m) => m.id === "file");
    const ids = (file?.items ?? [])
      .filter((i) => i.kind === "action")
      .map((i) => (i.kind === "action" ? i.id : ""));
    expect(ids).toContain("preferences");
    expect(ids).toContain("quit");
  });
});

describe("handleDesktopMenuShortcut", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches file-save on Ctrl+S", () => {
    const seen: string[] = [];
    window.addEventListener(DESKTOP_MENU_EVENT, ((ev: Event) => {
      if (ev instanceof CustomEvent) {
        seen.push(String((ev.detail as { action?: string }).action));
      }
    }) as EventListener);

    const ev = new KeyboardEvent("keydown", {
      key: "s",
      code: "KeyS",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(ev, "target", { value: document.body });
    expect(handleDesktopMenuShortcut(ev)).toBe(true);
    expect(seen).toContain("file-save");
  });

  it("ignores shortcuts in editable fields", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    const ev = new KeyboardEvent("keydown", {
      key: "s",
      code: "KeyS",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(ev, "target", { value: input });
    expect(handleDesktopMenuShortcut(ev)).toBe(false);
    input.remove();
  });
});
