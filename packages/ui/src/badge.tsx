import type { HTMLAttributes, ReactNode } from "react";
import "./badge.css";

export type BadgeProps = {
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children" | "className">;

/** Compact meta chip — intrinsic width (ui-density). */
export function Badge({ children, className = "", ...rest }: BadgeProps) {
  const classes = ["ss-badge", className].filter(Boolean).join(" ");
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
