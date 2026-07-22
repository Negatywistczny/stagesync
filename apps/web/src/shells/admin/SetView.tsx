import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@stagesync/ui";
import type { Library, SetlistView } from "@stagesync/shared";
import {
  fetchSetlist,
  patchSetlistAutoAdvance,
  putSetlist,
} from "../../lib/setlistApi.js";
import { ShellSwitchRow } from "../ShellSwitchRow.js";
import styles from "../AdminShell.module.css";

type SetViewProps = {
  library: Library | null;
  /** Optional preselect from Utwory — not required to add songs. */
  selectedId: string | null;
};

export function SetView({ library, selectedId }: SetViewProps) {
  const [view, setView] = useState<SetlistView | null>(null);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState("");
  const [pickIds, setPickIds] = useState<string[]>([]);

  const reload = useCallback(async () => {
    const next = await fetchSetlist();
    setView(next);
    setDraftIds(next.projectIds);
    setEnabled(next.enabled);
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
    // Only react to foreign tab selection — do not clear local picks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const nameFor = (id: string) =>
    library?.projects.find((p) => p.id === id)?.name ?? id.slice(0, 8);

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

  const onTogglePick = (id: string) => {
    setPickIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  };

  const onAddPicked = () => {
    if (pickIds.length === 0) return;
    setDraftIds((ids) => {
      const next = [...ids];
      for (const id of pickIds) {
        if (!next.includes(id)) next.push(id);
      }
      return next;
    });
    setPickIds([]);
    setDirty(true);
  };

  const onAddOne = (id: string) => {
    if (draftIds.includes(id)) return;
    setDraftIds((ids) => [...ids, id]);
    setDirty(true);
  };

  const onSave = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const next = await putSetlist({ enabled, projectIds: draftIds });
      setView(next);
      setDraftIds(next.projectIds);
      setEnabled(next.enabled);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zapis nieudany");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const onClear = () => {
    setDraftIds([]);
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
    setDraftIds((ids) => {
      const next = [...ids];
      const [item] = next.splice(dragIndex, 1);
      if (item) next.splice(toIndex, 0, item);
      return next;
    });
    setDirty(true);
    setDragIndex(null);
  };

  return (
    <section className={styles.card} aria-label="Set">
      <div className={styles.cardHead}>
        <h1 className={styles.cardTitle}>Set</h1>
      </div>
      <div className={styles.cardBody}>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.setControls}>
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

        <div className={styles.setSplit}>
          <div className={styles.setCol} aria-label="Biblioteka">
            <div className={styles.setColHead}>
              <strong className={styles.setColTitle}>Biblioteka</strong>
              <input
                className={styles.filterInput}
                type="search"
                placeholder="Filtr…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filtr utworów"
              />
            </div>
            <ul className={styles.setPickList}>
              {libraryRows.map((p) => {
                const inSet = draftIds.includes(p.id);
                const checked = pickIds.includes(p.id);
                return (
                  <li key={p.id} className={styles.setPickRow}>
                    <label className={styles.setPickLabel}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={inSet || pending}
                        onChange={() => onTogglePick(p.id)}
                      />
                      <span className={styles.songName}>{p.name}</span>
                    </label>
                    <Button
                      variant="ghost"
                      disabled={inSet || pending}
                      onClick={() => onAddOne(p.id)}
                    >
                      {inSet ? "✓" : "+"}
                    </Button>
                  </li>
                );
              })}
              {libraryRows.length === 0 ? (
                <li className={styles.muted}>Brak utworów w bibliotece.</li>
              ) : null}
            </ul>
            <div className={styles.actions}>
              <Button
                variant="secondary"
                disabled={pending || pickIds.length === 0}
                onClick={onAddPicked}
              >
                Dodaj zaznaczone ({pickIds.length})
              </Button>
            </div>
          </div>

          <div className={styles.setCol} aria-label="Kolejność setu">
            <div className={styles.setColHead}>
              <strong className={styles.setColTitle}>
                Set ({draftIds.length})
              </strong>
              <div className={styles.actions}>
                <Button
                  variant="primary"
                  disabled={pending || !dirty}
                  loading={pending}
                  onClick={() => void onSave()}
                >
                  Zapisz
                </Button>
                <Button
                  variant="ghost"
                  disabled={pending || draftIds.length === 0}
                  onClick={onClear}
                >
                  Wyczyść
                </Button>
              </div>
            </div>
            {draftIds.length === 0 ? null : (
              <ul className={styles.list} aria-label="Pozycje setu">
                {draftIds.map((id, index) => (
                  <li
                    key={`${id}-${index}`}
                    className={styles.songRow}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(index)}
                  >
                    <span className={styles.songPc}>{index + 1}</span>
                    <span className={styles.songName}>{nameFor(id)}</span>
                    <Button
                      variant="ghost"
                      disabled={pending}
                      onClick={() => {
                        setDraftIds((ids) => ids.filter((x) => x !== id));
                        setDirty(true);
                      }}
                    >
                      ×
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {view?.warnings?.length ? (
          <ul className={styles.muted}>
            {view.warnings.map((w) => (
              <li key={w.code}>{w.message}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
