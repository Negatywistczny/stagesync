import { Button, Select } from "@stagesync/ui";
import { type MidiHostStatus } from "@lib/shell-operator/setlistApi.js";
import styles from "../ServerSettingsModal.module.css";

interface MidiDraft {
  inputId: string | null;
  outputId: string | null;
  clockOutEnabled: boolean;
  inputChannel: number | null;
  outputChannel: number;
}

interface MidiSettingsTabProps {
  midiError: string | null;
  midiReady: boolean;
  midiStatus: MidiHostStatus | null;
  midiDraft: MidiDraft | null;
  saveBusy: boolean;
  panicBusy: boolean;
  panicHoldMs: number;
  panicConfirm: boolean;
  onPanicHoldStart: () => void;
  onPanicHoldEnd: () => void;
  onMidiDraftChange: (draft: MidiDraft) => void;
}

export function MidiSettingsTab({
  midiError,
  midiReady,
  midiStatus,
  midiDraft,
  saveBusy,
  panicBusy,
  panicHoldMs,
  panicConfirm,
  onPanicHoldStart,
  onPanicHoldEnd,
  onMidiDraftChange,
}: MidiSettingsTabProps) {
  return (
    <div className={styles.body} role="tabpanel">
      {midiError ? (
        <p className={styles.error} role="alert">
          {midiError}
        </p>
      ) : null}
      {midiReady && midiStatus && midiDraft ? (
        <>
          {!midiStatus.available ? (
            <p className={styles.muted}>MIDI niedostępne w tym środowisku.</p>
          ) : null}
          <div className={styles.panicBlock}>
            <Button
              variant="secondary"
              className={styles.panicBtn}
              disabled={
                panicBusy ||
                saveBusy ||
                !midiStatus.available ||
                !midiStatus.config.outputId
              }
              loading={panicBusy}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                onPanicHoldStart();
              }}
              onPointerUp={() => onPanicHoldEnd()}
              onPointerLeave={() => onPanicHoldEnd()}
              onPointerCancel={() => onPanicHoldEnd()}
              onClick={(e) => {
                e.preventDefault();
              }}
            >
              {panicHoldMs > 0
                ? `Przytrzymaj… ${Math.min(100, Math.round((panicHoldMs / 1000) * 100))}%`
                : "MIDI Panic / Reset Controllers"}
            </Button>
            {panicConfirm ? (
              <p className={styles.confirm} role="status">
                Wysłano sygnał Reset
              </p>
            ) : (
              <p className={styles.muted}>
                Przytrzymaj ~1 s — awaryjne wyciszenie nut i Reset Controllers
                na wszystkich kanałach wyjścia MIDI (bez PIN-u).
              </p>
            )}
          </div>
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Porty MIDI</legend>
            <label className={styles.field}>
              <span className={styles.label}>Wejście MIDI</span>
              <Select
                disabled={saveBusy || !midiStatus.available}
                value={midiDraft.inputId ?? ""}
                aria-label="Wejście MIDI"
                onChange={(e) => {
                  const v = e.target.value;
                  onMidiDraftChange({
                    ...midiDraft,
                    inputId: v === "" ? null : v,
                  });
                }}
              >
                <option value="">—</option>
                {midiStatus.inputs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Wyjście MIDI</span>
              <Select
                disabled={saveBusy || !midiStatus.available}
                value={midiDraft.outputId ?? ""}
                aria-label="Wyjście MIDI"
                onChange={(e) => {
                  const v = e.target.value;
                  onMidiDraftChange({
                    ...midiDraft,
                    outputId: v === "" ? null : v,
                  });
                }}
              >
                <option value="">—</option>
                {midiStatus.outputs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>
                Kanał wejściowy Program Change
              </span>
              <Select
                disabled={saveBusy || !midiStatus.available}
                value={
                  midiDraft.inputChannel == null
                    ? ""
                    : String(midiDraft.inputChannel)
                }
                aria-label="Kanał wejściowy Program Change"
                onChange={(e) => {
                  const v = e.target.value;
                  onMidiDraftChange({
                    ...midiDraft,
                    inputChannel: v === "" ? null : Number(v),
                  });
                }}
              >
                <option value="">Omni (wszystkie kanały)</option>
                {Array.from({ length: 16 }, (_, i) => (
                  <option key={i} value={String(i)}>
                    Kanał {i + 1}
                  </option>
                ))}
              </Select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>
                Kanał wyjściowy Program Change
              </span>
              <Select
                disabled={saveBusy || !midiStatus.available}
                value={String(midiDraft.outputChannel)}
                aria-label="Kanał wyjściowy Program Change"
                onChange={(e) => {
                  const v = Number(e.target.value);
                  onMidiDraftChange({
                    ...midiDraft,
                    outputChannel: v,
                  });
                }}
              >
                {Array.from({ length: 16 }, (_, i) => (
                  <option key={i} value={String(i)}>
                    Kanał {i + 1}
                  </option>
                ))}
              </Select>
            </label>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={midiDraft.clockOutEnabled}
                disabled={saveBusy || !midiStatus.available}
                aria-label="MIDI Clock OUT"
                onChange={(e) => {
                  const checked = e.target.checked;
                  onMidiDraftChange({
                    ...midiDraft,
                    clockOutEnabled: checked,
                  });
                }}
              />
              <span>Clock OUT</span>
            </label>
          </fieldset>
        </>
      ) : midiError ? null : (
        <p className={styles.muted}>Wczytywanie…</p>
      )}
    </div>
  );
}
