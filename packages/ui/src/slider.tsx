import type { InputHTMLAttributes } from "react";
import "./slider.css";

export type SliderProps = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange: (value: number) => void;
  className?: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "min" | "max" | "step" | "disabled" | "onChange"
>;

/**
 * Canonical StageSync range slider — `--ss-*` only.
 * States: default, hover, focus, active, disabled.
 */
export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  onValueChange,
  className = "",
  ...rest
}: SliderProps) {
  const classes = ["ss-slider", className].filter(Boolean).join(" ");

  return (
    <input
      type="range"
      className={classes}
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onChange={(e) => onValueChange(Number(e.target.value))}
      {...rest}
    />
  );
}
