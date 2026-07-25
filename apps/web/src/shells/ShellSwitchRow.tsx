import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./ShellSwitchRow.module.css";

export type ShellSwitchRowProps = {
  children: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role">;

export function ShellSwitchRow({
  children,
  className,
  checked,
  ...inputProps
}: ShellSwitchRowProps) {
  return (
    <label className={[styles.row, className].filter(Boolean).join(" ")}>
      <input
        type="checkbox"
        {...inputProps}
        role="switch"
        checked={checked}
        aria-checked={checked === true}
      />
      <span>{children}</span>
    </label>
  );
}
