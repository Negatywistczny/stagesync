import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
  DesktopMenuActionItem,
  DesktopMenuLeaf,
} from "@lib/client/desktopHtmlMenuModel.js";
import styles from "../DesktopMenuBar.module.css";
import { FixedFlyout } from "./FixedFlyout.js";
import { actionableOf } from "./menuBarUtils.js";

/**
 * One menu list (dropdown / compact level-2 / nested flyout) with
 * Windows-style keyboard + hover focus / submenu open.
 */
export function MenuList({
  items,
  onPick,
  listClassName,
  activeIndex,
  onActiveIndexChange,
  submenuId,
  submenuAnchor,
  onSubmenuChange,
  nestedActiveIndex,
  onNestedActiveIndexChange,
  onArrowLeftOut,
  onArrowRightOut,
}: {
  items: DesktopMenuLeaf[];
  onPick: (item: DesktopMenuActionItem) => void;
  listClassName: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  submenuId: string | null;
  submenuAnchor: HTMLElement | null;
  onSubmenuChange: (id: string | null, el: HTMLElement | null) => void;
  nestedActiveIndex: number;
  onNestedActiveIndexChange: (index: number) => void;
  /** Left with no open submenu → parent (prev top-level / sections). */
  onArrowLeftOut?: () => void;
  /** Right on non-submenu → parent (next top-level). */
  onArrowRightOut?: () => void;
}) {
  const actionable = useMemo(() => actionableOf(items), [items]);
  const openSub = useMemo(
    () =>
      items.find(
        (i): i is Extract<DesktopMenuLeaf, { kind: "submenu" }> =>
          i.kind === "submenu" && i.id === submenuId,
      ) ?? null,
    [items, submenuId],
  );
  const nestedActionable = useMemo(
    () => (openSub ? actionableOf(openSub.items) : []),
    [openSub],
  );
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const openSubAt = useCallback(
    (index: number) => {
      const row = actionable[index];
      if (!row || row.item.kind !== "submenu") return false;
      const el = itemRefs.current.get(row.item.id) ?? null;
      onSubmenuChange(row.item.id, el);
      onNestedActiveIndexChange(0);
      return true;
    },
    [actionable, onNestedActiveIndexChange, onSubmenuChange],
  );

  const activate = useCallback(
    (index: number) => {
      const row = actionable[index];
      if (!row) return;
      if (row.item.kind === "submenu") {
        openSubAt(index);
        return;
      }
      if (!row.item.disabled) onPick(row.item);
    },
    [actionable, onPick, openSubAt],
  );

  /** Keyboard when this list (or its nested flyout) owns focus. */
  const handleKey = useCallback(
    (ev: KeyboardEvent): boolean => {
      if (submenuId && openSub) {
        const n = nestedActionable.length;
        if (ev.key === "ArrowDown") {
          ev.preventDefault();
          if (n === 0) return true;
          onNestedActiveIndexChange((nestedActiveIndex + 1 + n) % n);
          return true;
        }
        if (ev.key === "ArrowUp") {
          ev.preventDefault();
          if (n === 0) return true;
          onNestedActiveIndexChange((nestedActiveIndex - 1 + n) % n);
          return true;
        }
        if (ev.key === "ArrowLeft" || ev.key === "Escape") {
          ev.preventDefault();
          onSubmenuChange(null, null);
          return true;
        }
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          const row = nestedActionable[nestedActiveIndex];
          if (row?.item.kind === "action" && !row.item.disabled) {
            onPick(row.item);
          }
          return true;
        }
        if (ev.key === "ArrowRight") {
          ev.preventDefault();
          return true;
        }
        return false;
      }

      const n = actionable.length;
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        if (n === 0) return true;
        const next = activeIndex < 0 ? 0 : (activeIndex + 1) % n;
        onActiveIndexChange(next);
        onSubmenuChange(null, null);
        return true;
      }
      if (ev.key === "ArrowUp") {
        ev.preventDefault();
        if (n === 0) return true;
        const next = activeIndex < 0 ? n - 1 : (activeIndex - 1 + n) % n;
        onActiveIndexChange(next);
        onSubmenuChange(null, null);
        return true;
      }
      if (ev.key === "ArrowRight") {
        ev.preventDefault();
        if (activeIndex >= 0 && openSubAt(activeIndex)) return true;
        onArrowRightOut?.();
        return true;
      }
      if (ev.key === "ArrowLeft") {
        ev.preventDefault();
        onArrowLeftOut?.();
        return true;
      }
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        if (activeIndex >= 0) activate(activeIndex);
        return true;
      }
      if (ev.key === "Home") {
        ev.preventDefault();
        if (n > 0) onActiveIndexChange(0);
        return true;
      }
      if (ev.key === "End") {
        ev.preventDefault();
        if (n > 0) onActiveIndexChange(n - 1);
        return true;
      }
      return false;
    },
    [
      actionable,
      activeIndex,
      activate,
      nestedActionable,
      nestedActiveIndex,
      onActiveIndexChange,
      onArrowLeftOut,
      onArrowRightOut,
      onNestedActiveIndexChange,
      onPick,
      onSubmenuChange,
      openSub,
      openSubAt,
      submenuId,
    ],
  );

  // Expose key handler via ref callback registration — parent listens globally.
  const handleKeyRef = useRef(handleKey);
  handleKeyRef.current = handleKey;

  useEffect(() => {
    // Parent attaches one listener; we use a custom event bus instead.
    const bus = (ev: Event) => {
      const ke = (ev as CustomEvent<KeyboardEvent>).detail;
      if (ke) handleKeyRef.current(ke);
    };
    window.addEventListener("stagesync:menu-key", bus as EventListener);
    return () =>
      window.removeEventListener("stagesync:menu-key", bus as EventListener);
  }, []);

  return (
    <>
      <ul className={listClassName} role="menu">
        {items.map((item) => {
          if (item.kind === "separator") {
            return (
              <li key={item.id} role="separator" className={styles.separator} />
            );
          }
          const idx = actionable.findIndex((a) => a.item.id === item.id);
          const isActive = idx === activeIndex;
          const isSubOpen = item.kind === "submenu" && submenuId === item.id;
          return (
            <li key={item.id} role="none" className={styles.submenu}>
              <button
                type="button"
                role="menuitem"
                ref={(el) => {
                  if (el) itemRefs.current.set(item.id, el);
                  else itemRefs.current.delete(item.id);
                }}
                className={[
                  styles.item,
                  isActive || isSubOpen ? styles.itemActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={item.kind === "action" ? item.disabled : undefined}
                aria-haspopup={item.kind === "submenu" ? true : undefined}
                aria-expanded={item.kind === "submenu" ? isSubOpen : undefined}
                tabIndex={isActive ? 0 : -1}
                onMouseEnter={(ev) => {
                  onActiveIndexChange(idx);
                  if (item.kind === "submenu") {
                    onSubmenuChange(item.id, ev.currentTarget);
                    onNestedActiveIndexChange(0);
                  } else {
                    onSubmenuChange(null, null);
                  }
                }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  if (item.kind === "submenu") {
                    if (isSubOpen) onSubmenuChange(null, null);
                    else {
                      onSubmenuChange(item.id, ev.currentTarget);
                      onNestedActiveIndexChange(0);
                    }
                    return;
                  }
                  if (!item.disabled) onPick(item);
                }}
              >
                <span>{item.label}</span>
                {item.kind === "submenu" ? (
                  <span className={styles.chevron} aria-hidden>
                    ›
                  </span>
                ) : item.shortcut ? (
                  <span className={styles.shortcut}>{item.shortcut}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {openSub ? (
        <FixedFlyout anchor={submenuAnchor}>
          {openSub.items.map((item) => {
            if (item.kind === "separator") {
              return (
                <li
                  key={item.id}
                  role="separator"
                  className={styles.separator}
                />
              );
            }
            if (item.kind === "submenu") {
              // One nested level only in model usage today.
              return (
                <li key={item.id} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.item}
                    disabled
                  >
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            }
            const nIdx = nestedActionable.findIndex(
              (a) => a.item.id === item.id,
            );
            const isActive = nIdx === nestedActiveIndex;
            return (
              <li key={item.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={[styles.item, isActive ? styles.itemActive : ""]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={item.disabled}
                  tabIndex={isActive ? 0 : -1}
                  onMouseEnter={() => onNestedActiveIndexChange(nIdx)}
                  onClick={() => {
                    if (!item.disabled) onPick(item);
                  }}
                >
                  <span>{item.label}</span>
                  {item.shortcut ? (
                    <span className={styles.shortcut}>{item.shortcut}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </FixedFlyout>
      ) : null}
    </>
  );
}
