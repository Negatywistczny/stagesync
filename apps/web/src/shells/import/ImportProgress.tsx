/**
 * Smooth determinate progress for US+UG audio ingest (YouTube / tempo analysis).
 */

import styles from "./ImportProgress.module.css";

export type ImportProgressProps = {
  label: string;
  /** 0…100 */
  value: number;
};

export function ImportProgress({ label, value }: ImportProgressProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={styles.root} role="status">
      <p className={styles.label}>{label}</p>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
      >
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
