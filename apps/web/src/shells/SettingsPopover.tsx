import { useEffect, useId, type ReactNode } from "react";
import { ShellIconButton } from "./ShellIconButton.js";
import { ShellAppearanceFields } from "./ShellAppearanceFields.js";
import styles from "./SettingsPopover.module.css";

export { ShellAppearanceFields };

export function SettingsPopoverAnchor({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={[styles.anchor, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export type SettingsPopoverProps = {
  id?: string;
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** `anchor` = under trigger; `fixed-top-right` = chrome appearance panel */
  placement?: "anchor" | "fixed-top-right";
};

export function SettingsPopover({
  id,
  title,
  children,
  onClose,
  placement = "anchor",
}: SettingsPopoverProps) {
  const titleId = useId();

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

  return (
    <div
      id={id}
      className={[
        styles.panel,
        placement === "fixed-top-right" ? styles.fixedTopRight : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-modal
      aria-labelledby={titleId}
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
}
