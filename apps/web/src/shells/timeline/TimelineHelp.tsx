/**
 * Timeline help overlay — sticky header/tabs, scrollable card body (v4 topic parity).
 */

import { useId, useMemo, useState } from "react";
import { Button } from "@stagesync/ui";
import { IconClose } from "../components/icons.js";
import { ShellIconButton } from "../components/ShellIconButton.js";
import styles from "./TimelineHelp.module.css";
import {
  KEY_GROUPS,
  TABS,
  TOOL_SECTIONS,
  type HelpTab,
} from "./help/TimelineHelpData.js";

export {
  KEY_GROUPS,
  TABS,
  TOOL_SECTIONS,
  type HelpTab,
  type ShortcutGroup,
  type ShortcutRow,
  type ToolBullet,
  type ToolSection,
} from "./help/TimelineHelpData.js";

/** Phrases that should stay as a single kbd chip. */
function isAtomicKeys(keys: string): boolean {
  return /przy |potem|,|drag/i.test(keys);
}

function KeyChord({ keys }: { keys: string }) {
  if (isAtomicKeys(keys)) {
    return <kbd className={styles.kbd}>{keys}</kbd>;
  }

  const alternatives = keys.split(" / ");
  return (
    <span className={styles.chord}>
      {alternatives.map((alt, altIdx) => {
        const parts = alt
          .split("+")
          .map((p) => p.trim())
          .filter(Boolean);
        return (
          <span key={`${alt}-${altIdx}`} className={styles.chordAlt}>
            {altIdx > 0 ? <span className={styles.keySlash}>/</span> : null}
            {parts.map((part, partIdx) => (
              <span key={`${part}-${partIdx}`} className={styles.chordPart}>
                {partIdx > 0 ? <span className={styles.keyPlus}>+</span> : null}
                <kbd className={styles.kbd}>{part}</kbd>
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}

function matchesQuery(haystack: string, query: string): boolean {
  if (!query) return true;
  return haystack.toLowerCase().includes(query);
}

export type TimelineHelpProps = {
  onClose: () => void;
};

/** Full help panel (header tabs + body). `?` / help icon wiring stays in TimelineShell. */
export function TimelineHelp({ onClose }: TimelineHelpProps) {
  const baseId = useId();
  const searchId = `${baseId}-search`;
  const [tab, setTab] = useState<HelpTab>("shortcuts");
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return KEY_GROUPS;
    return KEY_GROUPS.map((group) => ({
      ...group,
      rows: group.rows.filter(
        (row) =>
          matchesQuery(group.heading, normalizedQuery) ||
          matchesQuery(row.keys, normalizedQuery) ||
          matchesQuery(row.action, normalizedQuery),
      ),
    })).filter((group) => group.rows.length > 0);
  }, [normalizedQuery]);

  const filteredTools = useMemo(() => {
    if (!normalizedQuery) return TOOL_SECTIONS;
    return TOOL_SECTIONS.map((section) => ({
      ...section,
      bullets: section.bullets.filter(
        (b) =>
          matchesQuery(section.title, normalizedQuery) ||
          matchesQuery(b.term, normalizedQuery) ||
          matchesQuery(b.detail, normalizedQuery),
      ),
    })).filter((section) => section.bullets.length > 0);
  }, [normalizedQuery]);

  const isEmpty =
    tab === "shortcuts"
      ? filteredGroups.length === 0
      : filteredTools.length === 0;

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div className={styles.headMain}>
          <div className={styles.headText}>
            <p className={styles.eyebrow}>Timeline</p>
            <h2 id="tl-help-title" className={styles.title}>
              Pomoc
            </h2>
          </div>
          <div className={styles.searchRow}>
            <input
              id={searchId}
              className={styles.search}
              type="search"
              placeholder="Szukaj skrótów i opisów…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-label="Filtruj pomoc"
            />
          </div>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Sekcje pomocy Timeline"
          >
            {TABS.map((t) => {
              const selected = tab === t.id;
              return (
                <Button
                  key={t.id}
                  variant="ghost"
                  role="tab"
                  id={`${baseId}-${t.id}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-${t.id}-panel`}
                  tabIndex={selected ? 0 : -1}
                  selected={selected}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </Button>
              );
            })}
          </div>
        </div>
        <ShellIconButton label="Zamknij" onClick={onClose}>
          <IconClose />
        </ShellIconButton>
      </div>

      <div className={styles.body}>
        {isEmpty ? (
          <p className={styles.empty} role="status" aria-live="polite">
            Brak wyników dla „{query.trim()}”.
          </p>
        ) : null}

        {tab === "shortcuts" && !isEmpty ? (
          <div
            className={styles.keysGrid}
            role="tabpanel"
            id={`${baseId}-shortcuts-panel`}
            aria-labelledby={`${baseId}-shortcuts`}
          >
            {filteredGroups.map((group) => (
              <section key={group.heading} className={styles.keysCard}>
                <h3 className={styles.keysHeading}>{group.heading}</h3>
                <dl className={styles.keysDl}>
                  {group.rows.map((row) => (
                    <div key={row.keys} className={styles.keyRow}>
                      <dt>
                        <KeyChord keys={row.keys} />
                      </dt>
                      <dd>{row.action}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        ) : null}

        {tab === "tools" && !isEmpty ? (
          <div
            className={styles.toolsGrid}
            role="tabpanel"
            id={`${baseId}-tools-panel`}
            aria-labelledby={`${baseId}-tools`}
          >
            {filteredTools.map((section) => (
              <section key={section.title} className={styles.toolCard}>
                <h3 className={styles.toolCardTitle}>{section.title}</h3>
                <ul className={styles.toolList}>
                  {section.bullets.map((bullet) => (
                    <li
                      key={`${bullet.term}-${bullet.detail.slice(0, 24)}`}
                      className={styles.toolItem}
                    >
                      <span className={styles.toolBullet} aria-hidden />
                      <span className={styles.toolItemText}>
                        <span className={styles.term}>{bullet.term}</span>
                        {" — "}
                        {bullet.detail}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
