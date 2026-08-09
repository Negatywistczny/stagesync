import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  buildHtmlDesktopMenu,
  type DesktopMenuActionItem,
  type DesktopMenuLeaf,
  type DesktopMenuTopLevel,
} from "@lib/client/desktopHtmlMenuModel.js";
import { DESKTOP_MENU_EVENT } from "@lib/client/desktopMenuEvents.js";
import {
  EDIT_HISTORY_EVENT,
  type EditHistoryDetail,
  openExternalUrl,
} from "@lib/client/desktopBridge.js";
import { getRecentTimelineProjects } from "@lib/client/lastTimelineProject.js";
import { MQ_TABLET } from "@lib/timeline/breakpoints.js";
import styles from "./DesktopMenuBar.module.css";

const MENU_ROOT_ATTR = "data-ss-desktop-menu";

type Actionable = {
  item: Extract<DesktopMenuLeaf, { kind: "action" | "submenu" }>;
};

function dispatchAction(action: string): void {
  window.dispatchEvent(
    new CustomEvent(DESKTOP_MENU_EVENT, { detail: { action } }),
  );
}

function actionableOf(items: DesktopMenuLeaf[]): Actionable[] {
  const out: Actionable[] = [];
  for (const item of items) {
    if (item.kind === "action" || item.kind === "submenu") {
      out.push({ item });
    }
  }
  return out;
}

function useTitleBarCompact(): boolean {
  const [compact, setCompact] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MQ_TABLET).matches;
  });
  useEffect(() => {
    const mq = window.matchMedia(MQ_TABLET);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return compact;
}

/** Nested flyout portaled to body — avoids clipping by overflow parents. */
function FixedFlyout({
  anchor,
  children,
}: {
  anchor: HTMLElement | null;
  children: ReactNode;
}) {
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!anchor) {
      setStyle(null);
      return;
    }
    function place() {
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const width = Math.min(22 * 16, window.innerWidth - 16);
      let left = r.right - 2;
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, r.left - width + 2);
      }
      let top = r.top;
      const maxH = Math.min(window.innerHeight * 0.7, 28 * 16);
      if (top + maxH > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - 8 - maxH);
      }
      setStyle({ top, left, maxHeight: maxH });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor]);

  if (!anchor || !style || typeof document === "undefined") return null;

  return createPortal(
    <ul
      className={styles.flyoutFixed}
      style={style}
      role="menu"
      {...{ [MENU_ROOT_ATTR]: "" }}
    >
      {children}
    </ul>,
    document.body,
  );
}

/**
 * One menu list (dropdown / compact level-2 / nested flyout) with
 * Windows-style keyboard + hover focus / submenu open.
 */
function MenuList({
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
              <li
                key={item.id}
                role="separator"
                className={styles.separator}
              />
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
                  <button type="button" role="menuitem" className={styles.item} disabled>
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            }
            const nIdx = nestedActionable.findIndex((a) => a.item.id === item.id);
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

/**
 * Dispatch keyboard to the active MenuList via a lightweight bus so nested
 * FixedFlyout (portaled) still receives the same handler owner.
 */
function emitMenuKey(ev: KeyboardEvent): void {
  window.dispatchEvent(
    new CustomEvent("stagesync:menu-key", { detail: ev }),
  );
}

function CompactMenuRoot({
  menus,
  onPick,
  open,
  onToggle,
  onRegisterKeys,
}: {
  menus: DesktopMenuTopLevel[];
  onPick: (item: DesktopMenuActionItem) => void;
  open: boolean;
  onToggle: () => void;
  onRegisterKeys: (handler: ((ev: KeyboardEvent) => boolean) | null) => void;
}) {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [focusCol, setFocusCol] = useState<"sections" | "items">("sections");
  const [activeIndex, setActiveIndex] = useState(0);
  const [submenuId, setSubmenuId] = useState<string | null>(null);
  const [submenuAnchor, setSubmenuAnchor] = useState<HTMLElement | null>(null);
  const [nestedActiveIndex, setNestedActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setOpenSection(null);
      setSectionIndex(0);
      setFocusCol("sections");
      setActiveIndex(0);
      setSubmenuId(null);
      setSubmenuAnchor(null);
      return;
    }
    const first = menus[0];
    if (first) {
      setOpenSection(first.id);
      setSectionIndex(0);
      setFocusCol("sections");
    }
  }, [open, menus]);

  const active = menus.find((m) => m.id === openSection) ?? null;

  const selectSection = useCallback(
    (index: number) => {
      const menu = menus[index];
      if (!menu) return;
      setSectionIndex(index);
      setOpenSection(menu.id);
      setActiveIndex(0);
      setSubmenuId(null);
      setSubmenuAnchor(null);
      setFocusCol("sections");
    },
    [menus],
  );

  const onSubmenuChange = useCallback(
    (id: string | null, el: HTMLElement | null) => {
      setSubmenuId(id);
      setSubmenuAnchor(el);
    },
    [],
  );

  useEffect(() => {
    if (!open) {
      onRegisterKeys(null);
      return;
    }
    onRegisterKeys((ev) => {
      if (focusCol === "sections") {
        if (ev.key === "ArrowDown") {
          ev.preventDefault();
          selectSection((sectionIndex + 1) % menus.length);
          return true;
        }
        if (ev.key === "ArrowUp") {
          ev.preventDefault();
          selectSection((sectionIndex - 1 + menus.length) % menus.length);
          return true;
        }
        if (ev.key === "ArrowRight" || ev.key === "Enter") {
          ev.preventDefault();
          setFocusCol("items");
          setActiveIndex(0);
          return true;
        }
        if (ev.key === "Escape") {
          ev.preventDefault();
          onToggle();
          return true;
        }
        return false;
      }
      // items column — MenuList bus
      if (ev.key === "ArrowLeft" && !submenuId) {
        ev.preventDefault();
        setFocusCol("sections");
        setSubmenuId(null);
        return true;
      }
      emitMenuKey(ev);
      return true;
    });
    return () => onRegisterKeys(null);
  }, [
    focusCol,
    menus.length,
    onRegisterKeys,
    onToggle,
    open,
    sectionIndex,
    selectSection,
    submenuId,
  ]);

  return (
    <div className={styles.topItem}>
      <button
        type="button"
        role="menuitem"
        className={
          open ? `${styles.topButton} ${styles.topButtonOpen}` : styles.topButton
        }
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Menu aplikacji"
        onClick={onToggle}
      >
        Menu
      </button>
      {open ? (
        <div className={styles.compactPanel} role="presentation">
          <ul className={styles.compactSections} role="menu">
            {menus.map((menu, index) => {
              const selected = openSection === menu.id;
              return (
                <li key={menu.id} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={[
                      styles.item,
                      selected ? styles.itemSelected : "",
                      focusCol === "sections" && index === sectionIndex
                        ? styles.itemActive
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-haspopup="true"
                    aria-expanded={selected}
                    onMouseEnter={() => {
                      selectSection(index);
                      setFocusCol("sections");
                    }}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      selectSection(index);
                      setFocusCol("items");
                    }}
                  >
                    <span>{menu.label}</span>
                    <span className={styles.chevron} aria-hidden>
                      ›
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {active ? (
            <MenuList
              items={active.items}
              onPick={onPick}
              listClassName={styles.compactLevel2 ?? ""}
              activeIndex={focusCol === "items" ? activeIndex : -1}
              onActiveIndexChange={(i) => {
                setFocusCol("items");
                setActiveIndex(i);
              }}
              submenuId={submenuId}
              submenuAnchor={submenuAnchor}
              onSubmenuChange={onSubmenuChange}
              nestedActiveIndex={nestedActiveIndex}
              onNestedActiveIndexChange={setNestedActiveIndex}
              onArrowLeftOut={() => {
                setFocusCol("sections");
                setSubmenuId(null);
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function DesktopMenuBar() {
  const menubarId = useId();
  const compact = useTitleBarCompact();
  const [openId, setOpenId] = useState<string | null>(null);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [recentTick, setRecentTick] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [submenuId, setSubmenuId] = useState<string | null>(null);
  const [submenuAnchor, setSubmenuAnchor] = useState<HTMLElement | null>(null);
  const [nestedActiveIndex, setNestedActiveIndex] = useState(0);
  const compactKeysRef = useRef<((ev: KeyboardEvent) => boolean) | null>(null);

  useEffect(() => {
    function onHistory(ev: Event) {
      if (!(ev instanceof CustomEvent)) return;
      const detail = ev.detail as EditHistoryDetail | undefined;
      if (!detail || typeof detail !== "object") return;
      setHistory({
        canUndo: Boolean(detail.canUndo),
        canRedo: Boolean(detail.canRedo),
      });
    }
    window.addEventListener(EDIT_HISTORY_EVENT, onHistory);
    return () => window.removeEventListener(EDIT_HISTORY_EVENT, onHistory);
  }, []);

  useEffect(() => {
    setOpenId(null);
    setSubmenuId(null);
    setSubmenuAnchor(null);
    setActiveIndex(0);
  }, [compact]);

  const menus: DesktopMenuTopLevel[] = useMemo(() => {
    void recentTick;
    return buildHtmlDesktopMenu(getRecentTimelineProjects(), history);
  }, [history, recentTick]);

  const close = useCallback(() => {
    setOpenId(null);
    setSubmenuId(null);
    setSubmenuAnchor(null);
    setActiveIndex(0);
    setNestedActiveIndex(0);
  }, []);

  const openMenu = useCallback((id: string) => {
    setOpenId(id);
    setActiveIndex(0);
    setSubmenuId(null);
    setSubmenuAnchor(null);
    setNestedActiveIndex(0);
  }, []);

  const onPick = useCallback(
    (item: DesktopMenuActionItem) => {
      close();
      if (item.externalUrl) {
        void openExternalUrl(item.externalUrl);
        return;
      }
      if (item.action) dispatchAction(item.action);
    },
    [close],
  );

  const onSubmenuChange = useCallback(
    (id: string | null, el: HTMLElement | null) => {
      setSubmenuId(id);
      setSubmenuAnchor(el);
    },
    [],
  );

  const switchTop = useCallback(
    (delta: number) => {
      if (menus.length === 0) return;
      const idx = menus.findIndex((m) => m.id === openId);
      const base = idx < 0 ? 0 : idx;
      const next = menus[(base + delta + menus.length) % menus.length];
      if (next) openMenu(next.id);
    },
    [menus, openId, openMenu],
  );

  useEffect(() => {
    if (!openId) return;
    setRecentTick((n) => n + 1);
    function onPointerDown(ev: MouseEvent) {
      const t = ev.target;
      if (t instanceof Element && t.closest(`[${MENU_ROOT_ATTR}]`)) return;
      close();
    }
    function onKey(ev: KeyboardEvent) {
      if (compact) {
        if (compactKeysRef.current?.(ev)) return;
        if (ev.key === "Escape") {
          ev.preventDefault();
          close();
        }
        return;
      }

      if (ev.key === "Escape") {
        ev.preventDefault();
        if (submenuId) {
          setSubmenuId(null);
          setSubmenuAnchor(null);
          return;
        }
        close();
        return;
      }

      emitMenuKey(ev);
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [close, compact, openId, submenuId]);

  const openMenuItems =
    !compact && openId
      ? (menus.find((m) => m.id === openId)?.items ?? null)
      : null;

  return (
    <div
      id={menubarId}
      className={styles.menubar}
      role="menubar"
      aria-label="Menu aplikacji"
      data-compact={compact ? "true" : undefined}
      {...{ [MENU_ROOT_ATTR]: "" }}
    >
      {compact ? (
        <CompactMenuRoot
          menus={menus}
          onPick={onPick}
          open={openId === "compact"}
          onToggle={() =>
            openId === "compact" ? close() : openMenu("compact")
          }
          onRegisterKeys={(handler) => {
            compactKeysRef.current = handler;
          }}
        />
      ) : (
        menus.map((menu) => {
          const open = openId === menu.id;
          return (
            <div key={menu.id} className={styles.topItem}>
              <button
                type="button"
                role="menuitem"
                className={
                  open
                    ? `${styles.topButton} ${styles.topButtonOpen}`
                    : styles.topButton
                }
                aria-haspopup="true"
                aria-expanded={open}
                onClick={() => {
                  if (open) close();
                  else openMenu(menu.id);
                }}
                onMouseEnter={() => {
                  // Armed menubar: once any menu is open, hover switches.
                  if (openId !== null && openId !== menu.id) {
                    openMenu(menu.id);
                  }
                }}
              >
                {menu.label}
              </button>
              {open && openMenuItems ? (
                <MenuList
                  items={openMenuItems}
                  onPick={onPick}
                  listClassName={styles.dropdown ?? ""}
                  activeIndex={activeIndex}
                  onActiveIndexChange={setActiveIndex}
                  submenuId={submenuId}
                  submenuAnchor={submenuAnchor}
                  onSubmenuChange={onSubmenuChange}
                  nestedActiveIndex={nestedActiveIndex}
                  onNestedActiveIndexChange={setNestedActiveIndex}
                  onArrowLeftOut={() => switchTop(-1)}
                  onArrowRightOut={() => switchTop(1)}
                />
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
