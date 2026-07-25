import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { ShellIconButton } from "./ShellIconButton.js";
import { ShellAppearanceFields } from "./ShellAppearanceFields.js";
import styles from "./SettingsPopover.module.css";

export { ShellAppearanceFields };

const SettingsAnchorContext =
  createContext<RefObject<HTMLElement | null> | null>(null);

export function SettingsPopoverAnchor({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <SettingsAnchorContext.Provider value={ref}>
      <div
        ref={ref}
        className={[styles.anchor, className].filter(Boolean).join(" ")}
      >
        {children}
      </div>
    </SettingsAnchorContext.Provider>
  );
}

export type SettingsPopoverProps = {
  id?: string;
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** `anchor` = under trigger (portaled); `fixed-top-right` = chrome appearance panel */
  placement?: "anchor" | "fixed-top-right";
};

const VIEWPORT_PAD_PX = 8;

type AnchorPos = {
  top: number;
  right: number;
};

/**
 * Anchor placement is portaled to `document.body` with `position: fixed` so
 * parent overflow (Client mobile header `overflow-x: hidden`, stage panes)
 * cannot clip the dialog.
 */
export function SettingsPopover({
  id,
  title,
  children,
  onClose,
  placement = "anchor",
}: SettingsPopoverProps) {
  const titleId = useId();
  const anchorRef = useContext(SettingsAnchorContext);
  const [panelEl, setPanelEl] = useState<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<AnchorPos | null>(null);
  const portal =
    placement === "anchor" &&
    anchorRef != null &&
    typeof document !== "undefined";

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useLayoutEffect(() => {
    if (!portal || !anchorRef || !panelEl) return;
    const anchorEl = anchorRef;

    function place() {
      const a = anchorEl.current;
      const p = panelEl;
      if (!a || !p) return;
      const rect = a.getBoundingClientRect();
      const ph = p.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gap = 4; /* --ss-space-1 */
      let top = rect.bottom + gap;
      if (top + ph > vh - VIEWPORT_PAD_PX) {
        top = Math.max(VIEWPORT_PAD_PX, rect.top - ph - gap);
      }
      const right = Math.max(VIEWPORT_PAD_PX, vw - rect.right);
      setPos({ top, right });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [portal, anchorRef, panelEl]);

  const panel = (
    <div
      ref={setPanelEl}
      id={id}
      className={[
        styles.panel,
        placement === "fixed-top-right" ? styles.fixedTopRight : "",
        portal ? styles.portaled : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-modal
      aria-labelledby={titleId}
      style={
        portal
          ? pos
            ? { top: pos.top, right: pos.right }
            : { visibility: "hidden" }
          : undefined
      }
    >
      <div className={styles.head}>
        <span id={titleId} className={styles.title}>
          {title}
        </span>
        <ShellIconButton label="Zamknij" onClick={onClose}>
          ×
        </ShellIconButton>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );

  if (portal) {
    return createPortal(panel, document.body);
  }
  return panel;
}
