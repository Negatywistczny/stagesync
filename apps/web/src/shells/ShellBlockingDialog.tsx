import { useEffect, useId, useRef, type FormEvent } from "react";
import { Button } from "@stagesync/ui";
import styles from "./ShellBlockingDialog.module.css";

function useEscapeToClose(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
}

type ShellConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ShellConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Anuluj",
  pending = false,
  onConfirm,
  onCancel,
}: ShellConfirmDialogProps) {
  useEscapeToClose(open, onCancel);
  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal aria-labelledby="shell-confirm-title">
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Anuluj"
        disabled={pending}
        onClick={onCancel}
      />
      <div className={styles.panel}>
        <h2 id="shell-confirm-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={pending}
            loading={pending}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

type ShellPromptDialogProps = {
  open: boolean;
  title: string;
  label: string;
  defaultValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

export function ShellPromptDialog({
  open,
  title,
  label,
  defaultValue = "",
  confirmLabel = "Utwórz",
  onConfirm,
  onCancel,
}: ShellPromptDialogProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  useEscapeToClose(open, onCancel);

  useEffect(() => {
    if (!open) return;
    const input = inputRef.current;
    if (!input) return;
    input.value = defaultValue;
    input.focus();
    input.select();
  }, [open, defaultValue]);

  if (!open) return null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = inputRef.current?.value.trim() ?? "";
    onConfirm(value || "Nowy utwór");
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal aria-labelledby="shell-prompt-title">
      <button type="button" className={styles.backdrop} aria-label="Anuluj" onClick={onCancel} />
      <form className={styles.panel} onSubmit={onSubmit}>
        <h2 id="shell-prompt-title" className={styles.title}>
          {title}
        </h2>
        <label className={styles.field} htmlFor={inputId}>
          {label}
          <input
            ref={inputRef}
            id={inputId}
            className={styles.input}
            defaultValue={defaultValue}
            maxLength={200}
            autoComplete="off"
          />
        </label>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Anuluj
          </Button>
          <Button type="submit" variant="primary">
            {confirmLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}

type ShellAlertDialogProps = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

/** Zamiennik window.alert — działa w Tauri WebView. */
export function ShellAlertDialog({ open, title, message, onClose }: ShellAlertDialogProps) {
  useEscapeToClose(open, onClose);
  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal aria-labelledby="shell-alert-title">
      <button type="button" className={styles.backdrop} aria-label="Zamknij" onClick={onClose} />
      <div className={styles.panel}>
        <h2 id="shell-alert-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <Button variant="primary" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}
