import type { ReactNode } from "react";
import styles from "./BrandName.module.css";

/** Official StageSync wordmark: Stage = text, Sync = amber (logo). */
export function BrandName({ className }: { className?: string }): ReactNode {
  return (
    <span className={[styles.brandName, className].filter(Boolean).join(" ")}>
      <span className={styles.brandStage}>Stage</span>
      <span className={styles.brandSync}>Sync</span>
    </span>
  );
}
