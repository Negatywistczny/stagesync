import { useCallback, useEffect, useState } from "react";
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
  selectedId: string | null;
};

export function SetView({ library, selectedId }: SetViewProps) {
  const [view, setView] = useState<SetlistView | null>(null);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

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

  const nameFor = (id: string) =>
    library?.projects.find((p) => p.id === id)?.name ?? id.slice(0, 8);

  const onAddSelected = () => {
    if (!selectedId) return;
    if (draftIds.includes(selectedId)) return;
    setDraftIds((ids) => [...ids, selectedId]);
    setDirty(true);
  };

  const onSave = async () => {
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
    setPending(true);
    setError(null);
    try {
      const v = await patchSetlistAutoAdvance(next);
      setView(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-setlista");
    } finally {
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
        <div>
          <h1 className={styles.cardTitle}>Set</h1>
          <p className={styles.cardHint}>Kolejność utworów na koncert</p>
        </div>
      </div>
      <div className={styles.cardBody}>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
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
        <div className={styles.actions}>
          <Button
            variant="secondary"
            disabled={pending || !selectedId}
            onClick={onAddSelected}
          >
            Dodaj zaznaczone
          </Button>
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
        {draftIds.length === 0 ? (
          <p className={styles.muted}>
            Brak pozycji. Zaznacz utwór w Utwory i dodaj.
          </p>
        ) : (
          <ul className={styles.list} aria-label="Pozycje setu">
            {draftIds.map((id, index) => (
              <li
                key={id}
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
