import { Button } from "@stagesync/ui";
import { MetaBadge, MetaBadgeRow } from "../../shared/index.js";
import {
  formatSetDurationMs,
  type LibraryProjectEntry,
} from "@stagesync/shared";
import { catalogSongBadges } from "../songCatalogBadges.js";
import { projectDurationMs, type DraftItem } from "../setlistDraft.js";
import shell from "../../AdminShell.module.css";
import styles from "../SetView.module.css";

type SetEditorCardProps = {
  draftItems: DraftItem[];
  pending: boolean;
  dirty: boolean;
  timeBudgetMinutes: number;
  totalMs: number;
  budgetMs: number;
  budgetPct: number;
  overBudget: boolean;
  templateMenuOpen: boolean;
  templateMenuId: string;
  libraryRowCount: number;
  projectsById: Map<string, LibraryProjectEntry>;
  nameFor: (id: string) => string;
  onTimeBudgetChange: (minutes: number) => void;
  onAddBreak: (minutes?: number) => void;
  onToggleTemplateMenu: () => void;
  onLoadLibraryTemplate: () => void;
  onClear: () => void;
  onSave: () => void;
  onDrop: (toIndex: number) => void;
  onDragStart: (index: number) => void;
  onBreakDurationChange: (index: number, durationMinutes: number) => void;
  onRemoveItem: (index: number) => void;
};

export function SetEditorCard({
  draftItems,
  pending,
  dirty,
  timeBudgetMinutes,
  totalMs,
  budgetMs,
  budgetPct,
  overBudget,
  templateMenuOpen,
  templateMenuId,
  libraryRowCount,
  projectsById,
  nameFor,
  onTimeBudgetChange,
  onAddBreak,
  onToggleTemplateMenu,
  onLoadLibraryTemplate,
  onClear,
  onSave,
  onDrop,
  onDragStart,
  onBreakDurationChange,
  onRemoveItem,
}: SetEditorCardProps) {
  const setToolbar = (
    <div
      className={styles.setToolbar}
      role="toolbar"
      aria-label="Akcje setlisty"
    >
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => onAddBreak(5)}
      >
        + Dodaj przerwę
      </Button>
      <div className={styles.templateAnchor}>
        <Button
          variant="ghost"
          disabled={pending}
          aria-expanded={templateMenuOpen}
          aria-haspopup="menu"
          aria-controls={templateMenuId}
          onClick={onToggleTemplateMenu}
        >
          Wczytaj szablon ▾
        </Button>
        {templateMenuOpen ? (
          <div id={templateMenuId} className={styles.templateMenu} role="menu">
            <button
              type="button"
              className={styles.templateItem}
              role="menuitem"
              disabled={pending}
              onClick={() => onAddBreak(5)}
            >
              Zestaw z przerwą 5 min
            </button>
            <button
              type="button"
              className={styles.templateItem}
              role="menuitem"
              disabled={pending || libraryRowCount === 0}
              onClick={onLoadLibraryTemplate}
            >
              Cała biblioteka
            </button>
          </div>
        ) : null}
      </div>
      <Button
        variant="ghost"
        disabled={pending || draftItems.length === 0}
        aria-label="Wyczyść setlistę"
        onClick={onClear}
      >
        Wyczyść
      </Button>
      <Button
        variant="primary"
        disabled={pending || !dirty}
        loading={pending}
        aria-label="Zapisz setlistę"
        onClick={() => void onSave()}
      >
        Zapisz setlistę
      </Button>
    </div>
  );

  return (
    <>
      <div className={styles.summaryBlock}>
        <div className={styles.summaryRow}>
          <strong className={shell.setColTitle}>
            Set ({draftItems.length})
          </strong>
          <label className={styles.budgetLabel}>
            <span className={shell.muted}>Czas</span>
            <input
              className={styles.budgetInput}
              type="number"
              min={1}
              max={24 * 60}
              value={timeBudgetMinutes}
              disabled={pending}
              aria-label="Czas w minutach"
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                onTimeBudgetChange(
                  Math.min(24 * 60, Math.max(1, Math.trunc(n))),
                );
              }}
            />
            <span className={shell.muted}>min</span>
          </label>
        </div>
        <div className={styles.budgetMeta}>
          <span
            className={[
              styles.budgetTime,
              overBudget ? styles.budgetTimeOver : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {formatSetDurationMs(totalMs)} / {formatSetDurationMs(budgetMs)}
          </span>
          <span className={shell.muted}>
            {overBudget ? "Poza budżetem" : "W budżecie"}
          </span>
        </div>
        <div
          className={styles.budgetTrack}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={budgetPct}
          aria-label={`Budżet czasu ${budgetPct}%`}
        >
          <div
            className={[
              styles.budgetFill,
              overBudget ? styles.budgetFillOver : styles.budgetFillOk,
            ].join(" ")}
            style={{ width: `${budgetPct}%` }}
          />
        </div>
      </div>

      {setToolbar}

      {draftItems.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden>
            ♪
          </span>
          <p className={styles.emptyText} role="status">
            Przeciągnij utwory z biblioteki po lewej stronie lub użyj przycisku
            &apos;+&apos;
          </p>
        </div>
      ) : (
        <ul className={styles.setList} aria-label="Pozycje setu">
          {draftItems.map((item, index) => {
            if (item.type === "break") {
              return (
                <li
                  key={`break-${item.id}`}
                  className={[styles.setTile, styles.breakRow].join(" ")}
                  draggable
                  onDragStart={() => onDragStart(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(index)}
                >
                  <span
                    className={styles.dragHandle}
                    aria-hidden
                    title="Przeciągnij"
                  >
                    ::
                  </span>
                  <span className={styles.tileIndex}>{index + 1}</span>
                  <span className={styles.tileBody}>
                    <span className={styles.tileName}>{item.label}</span>
                    <label className={styles.breakDuration}>
                      <input
                        className={styles.budgetInput}
                        type="number"
                        min={1}
                        max={180}
                        value={item.durationMinutes}
                        disabled={pending}
                        aria-label="Czas przerwy w minutach"
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isFinite(n)) return;
                          onBreakDurationChange(
                            index,
                            Math.min(180, Math.max(1, Math.trunc(n))),
                          );
                        }}
                      />
                      <span className={shell.muted}>min</span>
                    </label>
                  </span>
                  <MetaBadgeRow>
                    <MetaBadge>
                      {formatSetDurationMs(item.durationMinutes * 60 * 1000)}
                    </MetaBadge>
                  </MetaBadgeRow>
                  <Button
                    variant="ghost"
                    iconOnly
                    className={styles.removeSlot}
                    disabled={pending}
                    aria-label="Usuń przerwę z setu"
                    onClick={() => onRemoveItem(index)}
                  >
                    ×
                  </Button>
                </li>
              );
            }

            const entry = projectsById.get(item.projectId);
            const durationMs = projectDurationMs(entry);
            const badges = entry ? catalogSongBadges(entry) : [];
            const metaBadges = badges.filter(
              (b) => b !== formatSetDurationMs(durationMs),
            );

            return (
              <li
                key={`${item.projectId}-${index}`}
                className={styles.setTile}
                draggable
                onDragStart={() => onDragStart(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(index)}
              >
                <span
                  className={styles.dragHandle}
                  aria-hidden
                  title="Przeciągnij"
                >
                  ::
                </span>
                <span className={styles.tileIndex}>{index + 1}</span>
                <span className={styles.tileBody}>
                  <span className={styles.tileName}>
                    {nameFor(item.projectId)}
                  </span>
                </span>
                <MetaBadgeRow>
                  <MetaBadge>{formatSetDurationMs(durationMs)}</MetaBadge>
                  {metaBadges.map((b, i) => (
                    <MetaBadge key={`${b}-${i}`}>{b}</MetaBadge>
                  ))}
                </MetaBadgeRow>
                <Button
                  variant="ghost"
                  iconOnly
                  className={styles.removeSlot}
                  disabled={pending}
                  aria-label={`Usuń ${nameFor(item.projectId)} z setu`}
                  onClick={() => onRemoveItem(index)}
                >
                  ×
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
