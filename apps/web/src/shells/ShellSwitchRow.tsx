import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./ShellSwitchRow.module.css";

export type ShellSwitchRowProps = {
  children: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function ShellSwitchRow({
  children,
  className,
  ...inputProps
}: ShellSwitchRowProps) {
  return (
    <label className={[styles.row, className].filter(Boolean).join(" ")}>
      <input type="checkbox" {...inputProps} />
      <span>{children}</span>
    </label>
  );
}
