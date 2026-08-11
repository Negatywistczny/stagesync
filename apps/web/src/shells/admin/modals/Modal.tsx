import { useId, type ReactNode } from "react";
import { ShellIconButton } from "../../components/ShellIconButton.js";
import styles from "../AdminShell.module.css";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** Wider panel for multi-step wizards (song import). */
  wide?: boolean;
}

export function Modal({ title, children, onClose, wide = false }: ModalProps) {
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
        aria-label="Zamknij"
        onClick={onClose}
      />
      <div className={wide ? styles.modalPanelWide : styles.modalPanel}>
        <div className={styles.modalHead}>
          <h2 id={titleId}>{title}</h2>
          <ShellIconButton label="Zamknij" onClick={onClose}>
            ×
          </ShellIconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
