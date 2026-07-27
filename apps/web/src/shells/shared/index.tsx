import { useEffect, useState, type HTMLAttributes, type ReactNode } from "react";
import styles from "./shellChrome.module.css";

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export type PanelCardProps = {
  title?: ReactNode;
  headExtra?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
  "aria-label"?: string;
} & Omit<HTMLAttributes<HTMLElement>, "title" | "children" | "className">;

export function PanelCard({
  title,
  headExtra,
  children,
  bodyClassName,
  className,
  "aria-label": ariaLabel,
  ...rest
}: PanelCardProps) {
  return (
    <section
      className={cx(styles.card, className)}
      aria-label={ariaLabel}
      {...rest}
    >
      {title != null || headExtra != null ? (
        <div className={styles.cardHead}>
          {title != null ? <h2 className={styles.cardTitle}>{title}</h2> : null}
          {headExtra}
        </div>
      ) : null}
      <div className={cx(styles.cardBody, bodyClassName)}>{children}</div>
    </section>
  );
}

export function MetaBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cx(styles.badge, className)}>{children}</span>;
}

export function MetaBadgeRow({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cx(styles.badgeRow, className)} {...rest}>
      {children}
    </span>
  );
}

export function ShellToolbar({
  children,
  className,
  asActions = false,
}: {
  children: ReactNode;
  className?: string;
  asActions?: boolean;
}) {
  return (
    <div className={cx(asActions ? styles.actions : styles.toolbar, className)}>
      {children}
    </div>
  );
}

export function NetworkUrlList({
  urls,
  onCopyError,
  onCopy,
  "aria-label": ariaLabel = "Adresy sieciowe",
}: {
  urls: string[];
  onCopyError?: (message: string) => void;
  onCopy?: () => void;
  "aria-label"?: string;
}) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedUrl) return;
    const t = window.setTimeout(() => setCopiedUrl(null), 2000);
    return () => window.clearTimeout(t);
  }, [copiedUrl]);

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      onCopy?.();
    } catch {
      setCopiedUrl(null);
      onCopyError?.("Nie udało się skopiować URL");
    }
  };

  return (
    <ul className={styles.urlList} aria-label={ariaLabel}>
      {urls.map((url) => (
        <li key={url} className={styles.urlRow}>
          <button
            type="button"
            className={styles.urlCopyBtn}
            onClick={() => {
              void copyUrl(url);
            }}
            aria-label={
              copiedUrl === url
                ? `Skopiowano adres: ${url}`
                : `Kopiuj adres: ${url}`
            }
          >
            <span className={styles.urlText}>{url}</span>
            {copiedUrl === url ? (
              <span className={styles.urlCopiedHint}>Skopiowano</span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function QrWrap({
  svg,
  "aria-label": ariaLabel,
}: {
  svg: string;
  "aria-label": string;
}) {
  return (
    <div
      className={styles.qrWrap}
      aria-label={ariaLabel}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export type MetricItem = {
  label: string;
  value: ReactNode;
};

export function MetricGrid({
  items,
  "aria-label": ariaLabel,
}: {
  items: MetricItem[];
  "aria-label"?: string;
}) {
  return (
    <div className={styles.metricGrid} aria-label={ariaLabel}>
      {items.map((m) => (
        <div key={m.label} className={styles.metric}>
          <p className={styles.metricLabel}>{m.label}</p>
          <p className={styles.metricValue}>{m.value}</p>
        </div>
      ))}
    </div>
  );
}

/** Re-export class map for gradual CSS Modules composes / className reuse. */
export { styles as shellChromeStyles };
