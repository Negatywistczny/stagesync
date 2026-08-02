import { useState } from "react";
import { Button, Input } from "@stagesync/ui";
import { type Library } from "@stagesync/shared";
import { batchMidiProgramIds } from "../../../lib/libraryApi.js";
import { Modal } from "./Modal.js";
import styles from "../../AdminShell.module.css";

interface BatchPcModalProps {
  library: Library | null;
  onClose: () => void;
  onSaved: (library: Library) => void | Promise<void>;
}

export function BatchPcModal({
  library,
  onClose,
  onSaved,
}: BatchPcModalProps) {
  const playable = (library?.projects ?? []).filter((p) => p.isTemplate !== true);
  const [draft, setDraft] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const p of playable) {
      init[p.id] = p.midiProgramId ?? 0;
    }
    return init;
  });
  const [start, setStart] = useState(playable[0]?.midiProgramId ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renumber = () => {
    const next = { ...draft };
    let pc = Math.max(0, Math.min(127, Math.round(start)));
    for (const p of playable) {
      next[p.id] = pc;
      pc = Math.min(127, pc + 1);
    }
    setDraft(next);
  };

  return (
    <Modal title="Numeracja Program Change" onClose={onClose}>
      <p className={styles.muted}>
        Numeracja Program Change (0–127) dla utworów (bez wzorów).
      </p>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <label className={styles.field}>
        Start Program Change
        <Input
          type="number"
          min={0}
          max={127}
          value={start}
          onChange={(e) => setStart(Number(e.target.value))}
        />
      </label>
      <Button variant="secondary" onClick={renumber}>
        Numeruj od startu
      </Button>
      <ul className={styles.list}>
        {playable.map((p) => (
          <li
            key={p.id}
            className={[styles.songRow, styles.songRowPair].join(" ")}
          >
            <span className={styles.songName}>{p.name}</span>
            <Input
              type="number"
              min={0}
              max={127}
              value={draft[p.id] ?? 0}
              aria-label={`PC ${p.name}`}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  [p.id]: Math.max(0, Math.min(127, Number(e.target.value))),
                }))
              }
            />
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          Anuluj
        </Button>
        <Button
          variant="primary"
          loading={busy}
          disabled={busy || playable.length === 0}
          onClick={() => {
            void (async () => {
              setBusy(true);
              setError(null);
              try {
                const assignments = playable.map((p) => ({
                  id: p.id,
                  midiProgramId: draft[p.id] ?? 0,
                }));
                const next = await batchMidiProgramIds(assignments);
                await onSaved(next);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Zapis PC nieudany");
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          Zapisz
        </Button>
      </div>
    </Modal>
  );
}
