import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  SETLIST_DEFAULT_TIME_BUDGET_MINUTES,
  type Library,
  type LibraryProjectEntry,
  type SetlistView,
} from "@stagesync/shared";
import {
  fetchSetlist,
  patchSetlistAutoAdvance,
  putSetlist,
} from "@lib/shell-operator/setlistApi.js";
import { setlistBudgetPercent } from "@lib/timeline-edit/setlistBudget.js";
import { useMqMobileCompact } from "@lib/client/useMqMobileCompact.js";
import { ShellSwitchRow } from "../ShellSwitchRow.js";
import { AdminAccordionCard } from "./AdminAccordionCard.js";
import shell from "../AdminShell.module.css";
import { SetEditorCard } from "./set/SetEditorCard.js";
import { SetLibraryCard } from "./set/SetLibraryCard.js";
import {
  draftToSetlistItems,
  estimateTotalMs,
  newBreakId,
  viewItemsToDraft,
  type DraftItem,
} from "./setlistDraft.js";

type SetCardId = "library" | "set";

type SetViewProps = {
  library: Library | null;
  selectedId: string | null;
};

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
  const compactMobile = useMqMobileCompact();
  const [openCard, setOpenCard] = useState<SetCardId>("set");

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

  const nameFor = (id: string) => projectsById.get(id)?.name ?? id.slice(0, 8);

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
  const budgetPct = setlistBudgetPercent(totalMs, budgetMs);
  const overBudget = totalMs > budgetMs;

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

  const onBreakDurationChange = (index: number, durationMinutes: number) => {
    setDraftItems((items) =>
      items.map((row, i) =>
        i === index && row.type === "break"
          ? { ...row, durationMinutes }
          : row,
      ),
    );
    setDirty(true);
  };

  const onRemoveItem = (index: number) => {
    setDraftItems((items) => items.filter((_, i) => i !== index));
    setDirty(true);
  };

  const errorBlock = error ? (
    <p className={shell.error} role="alert">
      {error}
    </p>
  ) : null;

  const switches = (
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
  );

  const libraryInner = (
    <SetLibraryCard
      compactMobile={compactMobile}
      filter={filter}
      onFilterChange={setFilter}
      libraryRows={libraryRows}
      draftProjectIds={draftProjectIds}
      pickIds={pickIds}
      pending={pending}
      onTogglePick={onTogglePick}
      onLibraryDragStart={onLibraryDragStart}
      onAddOne={onAddOne}
      onAddPicked={onAddPicked}
    />
  );

  const setInner = (
    <SetEditorCard
      draftItems={draftItems}
      pending={pending}
      dirty={dirty}
      timeBudgetMinutes={timeBudgetMinutes}
      totalMs={totalMs}
      budgetMs={budgetMs}
      budgetPct={budgetPct}
      overBudget={overBudget}
      templateMenuOpen={templateMenuOpen}
      templateMenuId={templateMenuId}
      libraryRowCount={libraryRows.length}
      projectsById={projectsById}
      nameFor={nameFor}
      onTimeBudgetChange={(minutes) => {
        setTimeBudgetMinutes(minutes);
        setDirty(true);
      }}
      onAddBreak={onAddBreak}
      onToggleTemplateMenu={() => setTemplateMenuOpen((o) => !o)}
      onLoadLibraryTemplate={onLoadLibraryTemplate}
      onClear={onClear}
      onSave={onSave}
      onDrop={onDrop}
      onDragStart={setDragIndex}
      onBreakDurationChange={onBreakDurationChange}
      onRemoveItem={onRemoveItem}
    />
  );

  const warnings = view?.warnings?.length ? (
    <ul className={shell.muted}>
      {view.warnings.map((w) => (
        <li key={w.code}>{w.message}</li>
      ))}
    </ul>
  ) : null;

  if (compactMobile) {
    return (
      <div className={shell.accordionStack} data-admin-mobile="1">
        <div className={shell.accordionChrome}>
          {errorBlock}
          {switches}
        </div>
        <AdminAccordionCard
          id="library"
          title="Biblioteka"
          titleAs="h1"
          ariaLabel="Biblioteka"
          mobile={compactMobile}
          openId={openCard}
          onOpen={setOpenCard}
          bodyClassName={[shell.cardBody, shell.cardBodyFill].join(" ")}
        >
          {libraryInner}
        </AdminAccordionCard>
        <AdminAccordionCard
          id="set"
          title={`Set (${draftItems.length})`}
          titleAs="h1"
          ariaLabel="Kolejność setu"
          mobile={compactMobile}
          openId={openCard}
          onOpen={setOpenCard}
          bodyClassName={[shell.cardBody, shell.cardBodyFill].join(" ")}
        >
          {setInner}
          {warnings}
        </AdminAccordionCard>
      </div>
    );
  }

  return (
    <section className={shell.card} aria-label="Set">
      <div className={shell.cardHead}>
        <h1 className={shell.cardTitle}>Set</h1>
      </div>
      <div className={shell.cardBody}>
        {errorBlock}
        {switches}
        <div className={shell.setSplit}>
          <div className={shell.setCol} role="region" aria-label="Biblioteka">
            {libraryInner}
          </div>
          <div
            className={shell.setCol}
            role="region"
            aria-label="Kolejność setu"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onSetPanelDrop}
          >
            {setInner}
          </div>
        </div>
        {warnings}
      </div>
    </section>
  );
}
