import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { Button } from "@stagesync/ui";
import { MetaBadge, MetaBadgeRow } from "../shared/index.js";
import {
  SETLIST_DEFAULT_TIME_BUDGET_MINUTES,
  SETLIST_SONG_DURATION_ESTIMATE_MS,
  formatSetDurationMs,
  type Library,
  type LibraryProjectEntry,
  type SetlistItem,
  type SetlistView,
} from "@stagesync/shared";
import {
  fetchSetlist,
  patchSetlistAutoAdvance,
  putSetlist,
} from "../../lib/setlistApi.js";
import { ShellSwitchRow } from "../ShellSwitchRow.js";
import { catalogSongBadges } from "./songCatalogBadges.js";
import shell from "../AdminShell.module.css";
import styles from "./SetView.module.css";

type SetViewProps = {
  library: Library | null;
  selectedId: string | null;
};

type DraftItem =
  | { type: "project"; projectId: string }
  | {
      type: "break";
      id: string;
      label: string;
      durationMinutes: number;
    };

function newBreakId(): string {
  return crypto.randomUUID();
}

function viewItemsToDraft(view: SetlistView): DraftItem[] {
  return view.items.map((item) =>
    item.type === "break"
      ? {
          type: "break" as const,
          id: item.id,
          label: item.label,
          durationMinutes: item.durationMinutes,
        }
      : { type: "project" as const, projectId: item.projectId },
  );
}

function draftToSetlistItems(draft: DraftItem[]): SetlistItem[] {
  return draft.map((item) =>
    item.type === "break"
      ? {
          type: "break" as const,
          id: item.id,
          label: item.label,
          durationMinutes: item.durationMinutes,
        }
      : { type: "project" as const, projectId: item.projectId },
  );
}

function projectDurationMs(entry: LibraryProjectEntry | undefined): number {
  if (entry?.durationMs != null && entry.durationMs > 0) {
    return entry.durationMs;
  }
  return SETLIST_SONG_DURATION_ESTIMATE_MS;
}

function estimateTotalMs(
  draft: DraftItem[],
  byId: Map<string, LibraryProjectEntry>,
): number {
  let ms = 0;
  for (const item of draft) {
    if (item.type === "break") {
      ms += item.durationMinutes * 60 * 1000;
    } else {
      ms += projectDurationMs(byId.get(item.projectId));
    }
  }
  return ms;
}

export function SetView({ library, selectedId }: SetViewProps) {
  const [view, setView] = useState<SetlistView | null>(null);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [timeBudgetMinutes, setTimeBudgetMinutes] = useState(
    SETLIST_DEFAULT_TIME_BUDGET_MINUTES,
  );
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState("");
  const [pickIds, setPickIds] = useState<string[]>([]);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const templateMenuId = "set-template-menu";

  useEffect(() => {
    if (!templateMenuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setTemplateMenuOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [templateMenuOpen]);

  const reload = useCallback(async () => {
    const next = await fetchSetlist();
    setView(next);
    setDraftItems(viewItemsToDraft(next));
    setEnabled(next.enabled);
    setTimeBudgetMinutes(next.timeBudgetMinutes);
    setDirty(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Błąd setlisty");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    if (selectedId && !pickIds.includes(selectedId)) {
      setPickIds((ids) => [...ids, selectedId]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const projectsById = useMemo(() => {
    const map = new Map<string, LibraryProjectEntry>();
    for (const p of library?.projects ?? []) {
      map.set(p.id, p);
    }
    return map;
  }, [library?.projects]);

  const nameFor = (id: string) =>
    projectsById.get(id)?.name ?? id.slice(0, 8);

  const draftProjectIds = useMemo(
    () =>
      draftItems
        .filter(
          (i): i is Extract<DraftItem, { type: "project" }> =>
            i.type === "project",
        )
        .map((i) => i.projectId),
    [draftItems],
  );

  const libraryRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const rows = [...(library?.projects ?? [])].filter(
      (p) => p.isTemplate !== true,
    );
    rows.sort((a, b) => a.name.localeCompare(b.name, "pl"));
    if (!q) return rows;
    return rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.artist ?? "").toLowerCase().includes(q),
    );
  }, [library?.projects, filter]);

  const totalMs = useMemo(
    () => estimateTotalMs(draftItems, projectsById),
    [draftItems, projectsById],
  );
  const budgetMs = timeBudgetMinutes * 60 * 1000;
  const budgetRatio = budgetMs > 0 ? Math.min(1, totalMs / budgetMs) : 0;
  const overBudget = totalMs > budgetMs;
  const budgetPct = Math.round(budgetRatio * 100);

  const onTogglePick = (id: string) => {
    setPickIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  };

  const onAddPicked = () => {
    if (pickIds.length === 0) return;
    setDraftItems((items) => {
      const next = [...items];
      const have = new Set(
        next
          .filter((i) => i.type === "project")
          .map((i) => (i as { projectId: string }).projectId),
      );
      for (const id of pickIds) {
        if (!have.has(id)) {
          next.push({ type: "project", projectId: id });
          have.add(id);
        }
      }
      return next;
    });
    setPickIds([]);
    setDirty(true);
  };

  const onAddOne = (id: string) => {
    if (draftProjectIds.includes(id)) return;
    setDraftItems((items) => [...items, { type: "project", projectId: id }]);
    setDirty(true);
  };

  const onAddBreak = (minutes = 5) => {
    setDraftItems((items) => [
      ...items,
      {
        type: "break",
        id: newBreakId(),
        label: "Przerwa / Zapowiedź",
        durationMinutes: minutes,
      },
    ]);
    setDirty(true);
    setTemplateMenuOpen(false);
  };

  const onLoadLibraryTemplate = () => {
    const rows = (library?.projects ?? []).filter((p) => p.isTemplate !== true);
    setDraftItems(
      rows.map((p) => ({ type: "project" as const, projectId: p.id })),
    );
    setDirty(true);
    setTemplateMenuOpen(false);
  };

  const onSave = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const next = await putSetlist({
        enabled,
        items: draftToSetlistItems(draftItems),
        timeBudgetMinutes,
      });
      setView(next);
      setDraftItems(viewItemsToDraft(next));
      setEnabled(next.enabled);
      setTimeBudgetMinutes(next.timeBudgetMinutes);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zapis nieudany");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const onClear = () => {
    setDraftItems([]);
    setDirty(true);
  };

  const onToggleEnabled = (next: boolean) => {
    setEnabled(next);
    setDirty(true);
  };

  const onAutoAdvance = async (next: boolean) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const v = await patchSetlistAutoAdvance(next);
      setView(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-setlista");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const onDrop = (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      return;
    }
    setDraftItems((items) => {
      const next = [...items];
      const [item] = next.splice(dragIndex, 1);
      if (item) next.splice(toIndex, 0, item);
      return next;
    });
    setDirty(true);
    setDragIndex(null);
  };

  const onLibraryDragStart = (projectId: string) => (e: DragEvent) => {
    e.dataTransfer.setData("application/x-stagesync-project", projectId);
    e.dataTransfer.effectAllowed = "copy";
  };

  const onSetPanelDrop = (e: DragEvent) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData("application/x-stagesync-project");
    if (projectId) onAddOne(projectId);
  };

  const setToolbar = (
    <div className={styles.setToolbar} role="toolbar" aria-label="Akcje setlisty">
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
          onClick={() => setTemplateMenuOpen((o) => !o)}
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
              disabled={pending || libraryRows.length === 0}
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
    <section className={shell.card} aria-label="Set">
      <div className={shell.cardHead}>
        <h1 className={shell.cardTitle}>Set</h1>
      </div>
      <div className={shell.cardBody}>
        {error ? (
          <p className={shell.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={shell.setControls}>
          <ShellSwitchRow
            checked={enabled}
            disabled={pending}
            onChange={(e) => onToggleEnabled(e.target.checked)}
          >
            Aktywny set
          </ShellSwitchRow>
          <ShellSwitchRow
            checked={Boolean(view?.autoAdvance.enabled)}
            disabled={pending || !enabled}
            onChange={(e) => void onAutoAdvance(e.target.checked)}
          >
            Auto-setlista
          </ShellSwitchRow>
        </div>

        <div className={shell.setSplit}>
          <div
            className={shell.setCol}
            role="region"
            aria-label="Biblioteka"
          >
            <div className={shell.setColHead}>
              <strong className={shell.setColTitle}>Biblioteka</strong>
              <input
                className={shell.filterInput}
                type="search"
                placeholder="Filtr…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filtr utworów"
              />
            </div>
            <ul className={shell.setPickList}>
              {libraryRows.map((p) => {
                const inSet = draftProjectIds.includes(p.id);
                const checked = pickIds.includes(p.id);
                return (
                  <li
                    key={p.id}
                    className={shell.setPickRow}
                    draggable={!inSet && !pending}
                    onDragStart={onLibraryDragStart(p.id)}
                  >
                    <label className={shell.setPickLabel}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={inSet || pending}
                        onChange={() => onTogglePick(p.id)}
                      />
                      <span className={shell.songName}>{p.name}</span>
                    </label>
                    <Button
                      variant="ghost"
                      iconOnly
                      disabled={inSet || pending}
                      aria-label={
                        inSet
                          ? `${p.name} — już w secie`
                          : `Dodaj ${p.name} do setu`
                      }
                      onClick={() => onAddOne(p.id)}
                    >
                      {inSet ? "✓" : "+"}
                    </Button>
                  </li>
                );
              })}
              {libraryRows.length === 0 ? (
                <li className={shell.muted}>Brak utworów w bibliotece.</li>
              ) : null}
            </ul>
            <div className={styles.libFooter}>
              <Button
                variant="secondary"
                disabled={pending || pickIds.length === 0}
                onClick={onAddPicked}
              >
                Dodaj zaznaczone ({pickIds.length})
              </Button>
            </div>
          </div>

          <div
            className={shell.setCol}
            role="region"
            aria-label="Kolejność setu"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onSetPanelDrop}
          >
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
                      setTimeBudgetMinutes(
                        Math.min(24 * 60, Math.max(1, Math.trunc(n))),
                      );
                      setDirty(true);
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
                  {formatSetDurationMs(totalMs)} /{" "}
                  {formatSetDurationMs(budgetMs)}
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
                  Przeciągnij utwory z biblioteki po lewej stronie lub użyj
                  przycisku &apos;+&apos;
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
                        onDragStart={() => setDragIndex(index)}
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
                                const durationMinutes = Math.min(
                                  180,
                                  Math.max(1, Math.trunc(n)),
                                );
                                setDraftItems((items) =>
                                  items.map((row, i) =>
                                    i === index && row.type === "break"
                                      ? { ...row, durationMinutes }
                                      : row,
                                  ),
                                );
                                setDirty(true);
                              }}
                            />
                            <span className={shell.muted}>min</span>
                          </label>
                        </span>
                        <MetaBadgeRow>
                          <MetaBadge>
                            {formatSetDurationMs(
                              item.durationMinutes * 60 * 1000,
                            )}
                          </MetaBadge>
                        </MetaBadgeRow>
                        <Button
                          variant="ghost"
                          iconOnly
                          className={styles.removeSlot}
                          disabled={pending}
                          aria-label="Usuń przerwę z setu"
                          onClick={() => {
                            setDraftItems((items) =>
                              items.filter((_, i) => i !== index),
                            );
                            setDirty(true);
                          }}
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
                      onDragStart={() => setDragIndex(index)}
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
                        <MetaBadge>
                          {formatSetDurationMs(durationMs)}
                        </MetaBadge>
                        {metaBadges.map((b, i) => (
                          <MetaBadge key={`${b}-${i}`}>
                            {b}
                          </MetaBadge>
                        ))}
                      </MetaBadgeRow>
                      <Button
                        variant="ghost"
                        iconOnly
                        className={styles.removeSlot}
                        disabled={pending}
                        aria-label={`Usuń ${nameFor(item.projectId)} z setu`}
                        onClick={() => {
                          setDraftItems((items) =>
                            items.filter((_, i) => i !== index),
                          );
                          setDirty(true);
                        }}
                      >
                        ×
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {view?.warnings?.length ? (
          <ul className={shell.muted}>
            {view.warnings.map((w) => (
              <li key={w.code}>{w.message}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
