import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import styles from "./DesktopMenuBar.module.css";
import { MENU_ROOT_ATTR } from "./menuBarUtils.js";

export function FixedFlyout({
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
