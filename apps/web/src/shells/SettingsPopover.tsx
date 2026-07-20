import type { ReactNode } from "react";
import { ShellIconButton } from "./ShellIconButton.js";
import { ShellSwitchRow } from "./ShellSwitchRow.js";
import styles from "./SettingsPopover.module.css";

export function ShellAppearanceFields() {
  return (
    <>
      <ShellSwitchRow disabled>Jasny motyw</ShellSwitchRow>
      <ShellSwitchRow disabled>Wysoki kontrast</ShellSwitchRow>
    </>
  );
}

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
      aria-label={title}
    >
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <ShellIconButton label="Zamknij" onClick={onClose}>
          ×
        </ShellIconButton>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
