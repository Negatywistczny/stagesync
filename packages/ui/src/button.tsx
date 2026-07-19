import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./button.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  /** Shows spinner and blocks interaction (loading state). */
  loading?: boolean;
  /** Toggle / selected state — sets aria-pressed. */
  selected?: boolean;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

/**
 * Canonical StageSync button — closed set of interaction states:
 * default, hover, focus, active, disabled, loading, selected.
 */
export function Button({
  children,
  variant = "primary",
  loading = false,
  selected,
  disabled,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);
  const classes = [
    "ss-btn",
    `ss-btn--${variant}`,
    loading ? "ss-btn--loading" : "",
    selected ? "ss-btn--selected" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      aria-pressed={typeof selected === "boolean" ? selected : undefined}
      {...rest}
    >
      {loading ? <span className="ss-btn__spinner" aria-hidden="true" /> : null}
      <span className="ss-btn__label">{children}</span>
    </button>
  );
}
