import { useId, type ReactNode } from "react";
import { ShellIconButton } from "../ShellIconButton.js";
import styles from "../ServerSettingsModal.module.css";

export function SettingsModalShell({
  title,
  children,
  footer,
  onDiscard,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onDiscard: () => void;
}) {
  const titleId = useId();
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Odrzuć"
        onClick={onDiscard}
      />
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2 id={titleId}>{title}</h2>
          <ShellIconButton label="Odrzuć" onClick={onDiscard}>
            ×
          </ShellIconButton>
        </div>
        <div className={styles.scroll}>{children}</div>
        {footer}
      </div>
    </div>
  );
}
