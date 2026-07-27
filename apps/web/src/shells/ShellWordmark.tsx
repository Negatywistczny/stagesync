import styles from "./ShellWordmark.module.css";

const LOGO_DARK = "/brand/stagesync-logo.svg";
const LOGO_LIGHT = "/brand/stagesync-logo-light.svg";

export type ShellWordmarkProps = {
  /** Rola / kontekst shella (np. Admin, Timeline). */
  suffix?: string;
  /** Wersja aplikacji obok wordmarku (np. w Admin). */
  version?: string;
  className?: string;
  /** Tylko ikona (bez sufiksu) — wąski pasek Client na telefonie. */
  iconOnly?: boolean;
  /** Klikalny wordmark (np. powrót do wyboru ról w Client). */
  onClick?: () => void;
  title?: string;
};

export function ShellWordmark({
  suffix,
  version,
  className,
  iconOnly = false,
  onClick,
  title,
}: ShellWordmarkProps) {
  const brandLabel = suffix ? `StageSync ${suffix}` : "StageSync";
  const logo = (
    <span
      className={styles.logo}
      {...(onClick
        ? { "aria-hidden": true as const }
        : { role: "img" as const, "aria-label": brandLabel })}
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
    <div
      className={[
        styles.identity,
        iconOnly ? styles.iconOnly : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {onClick ? (
        <button
          type="button"
          className={styles.wordmarkBtn}
          onClick={onClick}
          title={title}
          aria-label={title ?? brandLabel}
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
