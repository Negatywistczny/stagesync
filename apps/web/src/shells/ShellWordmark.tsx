import styles from "./ShellWordmark.module.css";

const LOGO_DARK = "/brand/stagesync-logo.svg";
const LOGO_LIGHT = "/brand/stagesync-logo-light.svg";

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
  const logo = (
    <span
      className={styles.logo}
      {...(onClick
        ? { "aria-hidden": true as const }
        : { role: "img" as const, "aria-label": "StageSync" })}
    >
      <img
        className={`${styles.logoImg} ${styles.logoDark}`}
        src={LOGO_DARK}
        alt=""
        decoding="async"
      />
      <img
        className={`${styles.logoImg} ${styles.logoLight}`}
        src={LOGO_LIGHT}
        alt=""
        decoding="async"
      />
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
          aria-label={title ?? "StageSync"}
        >
          {logo}
        </button>
      ) : (
        logo
      )}
      {suffix ? <span className={styles.suffix}>{suffix}</span> : null}
      {version ? <span className={styles.version}>{version}</span> : null}
    </div>
  );
}
