import {
  useEffect,
  useId,
  useRef,
  type FormEvent,
  type RefObject,
} from "react";
import { Button } from "@stagesync/ui";
import styles from "./ShellBlockingDialog.module.css";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useDialogFocusTrap(
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
  focusSelector?: string,
  onEscape?: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const panel = panelRef.current;
    if (!panel) return;

    const initial = focusSelector
      ? panel.querySelector<HTMLElement>(focusSelector)
      : panel.querySelector<HTMLElement>(FOCUSABLE);
    initial?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = [
        ...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ];
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panelRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, panelRef, focusSelector, onEscape]);
}

type ShellConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ShellConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Anuluj",
  onConfirm,
  onCancel,
}: ShellConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(open, panelRef, ".ss-btn--primary", onCancel);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal aria-labelledby="shell-confirm-title">
      <button type="button" className={styles.backdrop} aria-label="Anuluj" onClick={onCancel} />
      <div ref={panelRef} className={styles.panel}>
        <h2 id="shell-confirm-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onConfirm}>
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
  const panelRef = useRef<HTMLFormElement>(null);
  useDialogFocusTrap(open, panelRef, undefined, onCancel);

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
      <form ref={panelRef} className={styles.panel} onSubmit={onSubmit}>
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
            maxLength={120}
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
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(open, panelRef, ".ss-btn--primary", onClose);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal aria-labelledby="shell-alert-title">
      <button type="button" className={styles.backdrop} aria-label="Zamknij" onClick={onClose} />
      <div ref={panelRef} className={styles.panel}>
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
