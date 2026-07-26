import type { ElementType, ReactNode } from "react";
import shell from "../AdminShell.module.css";

function cx(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(" ");
}

export type AdminAccordionCardProps<T extends string = string> = {
  id: T;
  title: ReactNode;
  /** Heading element for the title (default `h2`). */
  titleAs?: "h1" | "h2";
  ariaLabel: string;
  mobile: boolean;
  openId: T;
  onOpen: (id: T) => void;
  /** Extra content in the mobile toggle / desktop head (e.g. counts). */
  headMeta?: ReactNode;
  /** Actions outside the toggle (must not nest interactive controls in the button). */
  headActions?: ReactNode;
  /**
   * Full desktop card head content. When set, replaces the default title+headMeta
   * on non-mobile. Mobile always uses `title` (+ optional `headMeta`) as the toggle.
   */
  desktopHead?: ReactNode;
  bodyClassName?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Admin section card — on phone (`mobile`), one open panel at a time via parent
 * `openId` / `onOpen`. No chevron; `aria-expanded` exposes state. Tablets/desktop
 * always show the body (pass `mobile={false}`).
 */
export function AdminAccordionCard<T extends string = string>({
  id,
  title,
  titleAs = "h2",
  ariaLabel,
  mobile,
  openId,
  onOpen,
  headMeta,
  headActions,
  desktopHead,
  bodyClassName,
  className,
  children,
}: AdminAccordionCardProps<T>) {
  const expanded = !mobile || openId === id;
  const panelId = `admin-acc-${id}`;
  const TitleTag = titleAs as ElementType;

  return (
    <section
      className={cx(
        shell.card,
        className,
        mobile && !expanded && shell.cardCollapsed,
      )}
      aria-label={ariaLabel}
    >
      <div className={shell.cardHead}>
        {mobile ? (
          <button
            type="button"
            className={shell.cardToggle}
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => onOpen(id)}
          >
            <TitleTag className={shell.cardTitle}>{title}</TitleTag>
            {headMeta ? (
              <span className={shell.cardToggleMeta}>{headMeta}</span>
            ) : null}
          </button>
        ) : desktopHead ? (
          desktopHead
        ) : (
          <>
            <TitleTag className={shell.cardTitle}>{title}</TitleTag>
            {headMeta}
          </>
        )}
        {headActions}
      </div>
      {expanded ? (
        <div
          id={panelId}
          className={cx(shell.accordionPanel, bodyClassName ?? shell.cardBody)}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
