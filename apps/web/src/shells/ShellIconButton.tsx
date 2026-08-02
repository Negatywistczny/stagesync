import type { ButtonHTMLAttributes, ReactNode, RefObject } from "react";
import { Button } from "@stagesync/ui";
import styles from "./ShellIconButton.module.css";

export type ShellIconButtonProps = {
  label: string;
  children: ReactNode;
  pressed?: boolean;
  /** Double-confirm arming (pulse ring) — not a toggle. */
  confirming?: boolean;
  /** Danger tone for confirming / hover (e.g. shutdown). */
  danger?: boolean;
  ref?: RefObject<HTMLButtonElement | null>;
} & Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | "disabled"
  | "onClick"
  | "aria-expanded"
  | "aria-controls"
  | "aria-haspopup"
  | "aria-keyshortcuts"
  | "className"
  | "type"
>;

/**
 * Thin chrome wrapper: `@stagesync/ui` `Button iconOnly` + shell accents
 * (confirming pulse / danger) that do not override control geometry.
 */
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
  "aria-haspopup": ariaHaspopup,
  "aria-keyshortcuts": ariaKeyshortcuts,
}: ShellIconButtonProps) {
  return (
    <Button
      ref={ref}
      type={type}
      variant="ghost"
      iconOnly
      selected={pressed}
      className={[
        styles.shellIcon,
        confirming ? styles.confirming : "",
        danger ? styles.danger : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      title={label}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-haspopup={ariaHaspopup}
      aria-keyshortcuts={ariaKeyshortcuts}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
