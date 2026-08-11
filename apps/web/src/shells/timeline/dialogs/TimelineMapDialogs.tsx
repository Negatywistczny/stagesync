import React from "react";
import type { Project } from "@stagesync/shared";
import { Button } from "@stagesync/ui";
import { ShellAlertDialog } from "../../components/ShellBlockingDialog.js";
import { resolveKeyAt, normalizeKeyTonic } from "@stagesync/shared";
import {
  upsertKeyAt,
  upsertMeterAt,
  upsertTempoAt,
} from "@lib/timeline/mapLaneEdit.js";
import { TOUCH_FULL_EDIT_MSG } from "@lib/timeline/timelineTouchTier.js";
import styles from "../TimelineShell.module.css";

export type TimelineMapDialogsProps = {
  draftProject: Project | null;
  displayTicks: number;
  mapEditTicks: number;
  commitDraft: (next: Project) => void;
  tempoEditOpen: boolean;
  setTempoEditOpen: (open: boolean) => void;
  tempoEditTitleId: string;
  tempoDraft: string;
  setTempoDraft: (val: string) => void;
  meterEditOpen: boolean;
  setMeterEditOpen: (open: boolean) => void;
  meterEditTitleId: string;
  meterNumDraft: string;
  setMeterNumDraft: (val: string) => void;
  meterDenDraft: string;
  setMeterDenDraft: (val: string) => void;
  keyEditOpen: boolean;
  setKeyEditOpen: (open: boolean) => void;
  keyEditTitleId: string;
  touchAlertOpen: boolean;
  setTouchAlertOpen: (open: boolean) => void;
};

export function TimelineMapDialogs({
  draftProject,
  displayTicks,
  mapEditTicks,
  commitDraft,
  tempoEditOpen,
  setTempoEditOpen,
  tempoEditTitleId,
  tempoDraft,
  setTempoDraft,
  meterEditOpen,
  setMeterEditOpen,
  meterEditTitleId,
  meterNumDraft,
  setMeterNumDraft,
  meterDenDraft,
  setMeterDenDraft,
  keyEditOpen,
  setKeyEditOpen,
  keyEditTitleId,
  touchAlertOpen,
  setTouchAlertOpen,
}: TimelineMapDialogsProps) {
  if (!draftProject) return null;

  return (
    <>
      {tempoEditOpen ? (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal
          aria-labelledby={tempoEditTitleId}
        >
          <div className={styles.overlayPanel}>
            <h2 id={tempoEditTitleId}>
              Tempo @ {mapEditTicks === displayTicks ? "playhead" : "ścieżka"}
            </h2>
            <label className={styles.inspField}>
              BPM
              <input
                className={styles.lengthInput}
                type="number"
                min={20}
                max={400}
                value={tempoDraft}
                onChange={(e) => setTempoDraft(e.target.value)}
              />
            </label>
            <div className={styles.overlayActions}>
              <Button variant="ghost" onClick={() => setTempoEditOpen(false)}>
                Anuluj
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const bpm = Number(tempoDraft);
                  if (!Number.isFinite(bpm) || bpm <= 0) return;
                  commitDraft(upsertTempoAt(draftProject, mapEditTicks, bpm));
                  setTempoEditOpen(false);
                }}
              >
                Zapisz
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {meterEditOpen ? (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal
          aria-labelledby={meterEditTitleId}
        >
          <div className={styles.overlayPanel}>
            <h2 id={meterEditTitleId}>
              Metrum @ {mapEditTicks === displayTicks ? "playhead" : "ścieżka"}
            </h2>
            <div
              className={styles.meterEditRow}
              role="group"
              aria-label="Metrum"
            >
              <input
                className={styles.lengthInput}
                type="number"
                min={1}
                max={32}
                value={meterNumDraft}
                aria-label="Metrum — górna liczba"
                onChange={(e) => setMeterNumDraft(e.target.value)}
              />
              <span className={styles.meterEditSlash} aria-hidden>
                /
              </span>
              <select
                className={styles.nameInput}
                value={meterDenDraft}
                aria-label="Metrum — dolna liczba"
                onChange={(e) => setMeterDenDraft(e.target.value)}
              >
                {[1, 2, 4, 8, 16].map((d) => (
                  <option key={d} value={String(d)}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.overlayActions}>
              <Button variant="ghost" onClick={() => setMeterEditOpen(false)}>
                Anuluj
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const numerator = Number(meterNumDraft);
                  const denominator = Number(meterDenDraft);
                  if (
                    !Number.isFinite(numerator) ||
                    !Number.isFinite(denominator) ||
                    numerator < 1 ||
                    denominator < 1
                  ) {
                    return;
                  }
                  commitDraft(
                    upsertMeterAt(
                      draftProject,
                      mapEditTicks,
                      numerator,
                      denominator,
                    ),
                  );
                  setMeterEditOpen(false);
                }}
              >
                Zapisz
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {keyEditOpen ? (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal
          aria-labelledby={keyEditTitleId}
        >
          <div className={styles.overlayPanel}>
            <h2 id={keyEditTitleId}>
              Tonacja @ {mapEditTicks === displayTicks ? "playhead" : "ścieżka"}
            </h2>
            <div
              className={styles.keyEditRow}
              role="group"
              aria-label="Tonacja"
            >
              <select
                className={styles.nameInput}
                id="key-tonic"
                aria-label="Tonika"
                defaultValue={
                  resolveKeyAt(draftProject, mapEditTicks)?.tonic ?? "C"
                }
              >
                {[
                  "C",
                  "C#",
                  "Db",
                  "D",
                  "Eb",
                  "E",
                  "F",
                  "F#",
                  "Gb",
                  "G",
                  "Ab",
                  "A",
                  "Bb",
                  "B",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                className={styles.nameInput}
                id="key-mode"
                aria-label="Tryb"
                defaultValue={
                  resolveKeyAt(draftProject, mapEditTicks)?.mode ?? "major"
                }
              >
                <option value="major">Dur</option>
                <option value="minor">Moll</option>
              </select>
            </div>
            <div className={styles.overlayActions}>
              <Button variant="ghost" onClick={() => setKeyEditOpen(false)}>
                Anuluj
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const tonicEl = document.getElementById(
                    "key-tonic",
                  ) as HTMLSelectElement | null;
                  const modeEl = document.getElementById(
                    "key-mode",
                  ) as HTMLSelectElement | null;
                  const tonic = normalizeKeyTonic(tonicEl?.value, "C");
                  const mode =
                    modeEl?.value === "minor"
                      ? ("minor" as const)
                      : ("major" as const);
                  commitDraft(
                    upsertKeyAt(draftProject, mapEditTicks, { tonic, mode }),
                  );
                  setKeyEditOpen(false);
                }}
              >
                Zapisz
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ShellAlertDialog
        open={touchAlertOpen}
        title="Edycja na tym urządzeniu"
        message={TOUCH_FULL_EDIT_MSG}
        onClose={() => setTouchAlertOpen(false)}
      />
    </>
  );
}
