import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "./button.js";
import "./segmented.css";

export type SegmentedOption<T extends string = string> = {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  "aria-label"?: string;
};

export type SegmentedControlProps<T extends string = string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  variant?: ButtonVariant;
  className?: string;
  "aria-label"?: string;
};

/** Exclusive Button group (selected = pressed). */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  variant = "ghost",
  className = "",
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  const classes = ["ss-segmented", className].filter(Boolean).join(" ");
  return (
    <div className={classes} role="group" aria-label={ariaLabel}>
      {options.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          variant={variant}
          selected={opt.value === value}
          disabled={opt.disabled}
          aria-label={opt["aria-label"]}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
