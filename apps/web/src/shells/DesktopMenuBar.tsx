import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildHtmlDesktopMenu,
  type DesktopMenuActionItem,
  type DesktopMenuTopLevel,
} from "@lib/client/desktopHtmlMenuModel.js";
import {
  EDIT_HISTORY_EVENT,
  type EditHistoryDetail,
  openExternalUrl,
} from "@lib/client/desktopBridge.js";
import { getRecentTimelineProjects } from "@lib/client/lastTimelineProject.js";
import styles from "./DesktopMenuBar.module.css";
import { CompactMenuRoot } from "./desktop/CompactMenuRoot.js";
import { MenuList } from "./desktop/MenuList.js";
import {
  dispatchAction,
  emitMenuKey,
  MENU_ROOT_ATTR,
  useTitleBarCompact,
} from "./desktop/menuBarUtils.js";

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
