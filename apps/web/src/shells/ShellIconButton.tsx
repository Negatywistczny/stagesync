import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./ShellIconButton.module.css";

export type ShellIconButtonProps = {
  label: string;
  children: ReactNode;
  pressed?: boolean;
} & Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled" | "onClick" | "aria-expanded" | "aria-controls" | "className" | "type"
>;

export function ShellIconButton({
  label,
  children,
  pressed,
  disabled,
  onClick,
  className,
  type = "button",
  "aria-expanded": ariaExpanded,
  "aria-controls": ariaControls,
}: ShellIconButtonProps) {
  return (
    <button
      type={type}
      className={[
        styles.btn,
        pressed ? styles.pressed : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
