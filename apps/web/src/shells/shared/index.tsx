import type { HTMLAttributes, ReactNode } from "react";
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

export type NetworkUrlItem = {
  url: string;
  action: ReactNode;
};

export function NetworkUrlList({
  urls,
  "aria-label": ariaLabel = "Adresy sieciowe",
}: {
  urls: NetworkUrlItem[];
  "aria-label"?: string;
}) {
  return (
    <ul className={styles.urlList} aria-label={ariaLabel}>
      {urls.map(({ url, action }) => (
        <li key={url} className={styles.urlRow}>
          <span className={styles.urlText}>{url}</span>
          {action}
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
