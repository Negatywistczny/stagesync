import styles from "./ShellWordmark.module.css";

export type ShellWordmarkProps = {
  /** Rola / kontekst shella (np. Admin, Timeline). */
  suffix?: string;
  /** Wersja aplikacji obok wordmarku (np. w Admin). */
  version?: string;
  className?: string;
  /** Klikalny wordmark (np. powrót do wyboru ról w Client). */
  onClick?: () => void;
  title?: string;
};

export function ShellWordmark({
  suffix,
  version,
  className,
  onClick,
  title,
}: ShellWordmarkProps) {
  const wordmark = (
    <span className={styles.wordmark}>
      Stage<span className={styles.mark}>Sync</span>
    </span>
  );

  return (
    <div className={[styles.identity, className].filter(Boolean).join(" ")}>
      {onClick ? (
        <button
          type="button"
          className={styles.wordmarkBtn}
          onClick={onClick}
          title={title}
        >
          {wordmark}
        </button>
      ) : (
        wordmark
      )}
      {suffix ? <span className={styles.suffix}>{suffix}</span> : null}
      {version ? <span className={styles.version}>{version}</span> : null}
    </div>
  );
}
