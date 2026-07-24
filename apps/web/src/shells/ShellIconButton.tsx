import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import styles from "./ShellIconButton.module.css";

export type ShellIconButtonProps = {
  label: string;
  children: ReactNode;
  pressed?: boolean;
  /** Double-confirm arming (pulse ring) — not a toggle. */
  confirming?: boolean;
  /** Danger tone for confirming / hover (e.g. shutdown). */
  danger?: boolean;
  ref?: Ref<HTMLButtonElement>;
} & Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | "disabled"
  | "onClick"
  | "aria-expanded"
  | "aria-controls"
  | "aria-keyshortcuts"
  | "className"
  | "type"
>;

export function ShellIconButton({
  label,
  children,
  pressed,
  confirming,
  danger,
  disabled,
  onClick,
  className,
  type = "button",
  ref,
  "aria-expanded": ariaExpanded,
  "aria-controls": ariaControls,
  "aria-keyshortcuts": ariaKeyshortcuts,
}: ShellIconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={[
        styles.btn,
        pressed ? styles.pressed : "",
        confirming ? styles.confirming : "",
        danger ? styles.danger : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-keyshortcuts={ariaKeyshortcuts}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
