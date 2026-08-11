import { useCallback, useEffect, useState } from "react";
import type {
  DesktopMenuActionItem,
  DesktopMenuTopLevel,
} from "@lib/client/desktopHtmlMenuModel.js";
import styles from "../DesktopMenuBar.module.css";
import { MenuList } from "./MenuList.js";
import { emitMenuKey } from "./menuBarUtils.js";

export function CompactMenuRoot({
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
          open
            ? `${styles.topButton} ${styles.topButtonOpen}`
            : styles.topButton
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
