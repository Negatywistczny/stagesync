import React from "react";
import { Button } from "@stagesync/ui";
import {
  resolveKeyAt,
  type Project,
  normalizeKeyTonic,
  parseMeterString,
} from "@stagesync/shared";
import { upsertKeyAt, upsertMeterAt } from "@lib/timeline/mapLaneEdit.js";
import styles from "../../TimelineShell.module.css";

export function SongMetaInspector({
  draftProject,
  commitDraft,
  openSongImportWizard,
}: {
  draftProject: Project;
  commitDraft: (next: Project) => void;
  openSongImportWizard: (asNew: boolean) => void;
}) {
  return (
    <div className={styles.inspBody}>
      <label className={styles.inspField}>
        Tytuł
        <input
          className={styles.nameInput}
          value={draftProject.name}
          aria-label="Tytuł utworu"
          onChange={(e) => {
            commitDraft({
              ...draftProject,
              name: e.target.value || draftProject.name,
            });
          }}
        />
      </label>
      <label className={styles.inspField}>
        Tempo domyślne (BPM)
        <input
          className={styles.lengthInput}
          type="number"
          min={20}
          max={400}
          step={1}
          value={draftProject.defaultBpm}
          aria-label="Tempo domyślne"
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n) || n <= 0) return;
            commitDraft({ ...draftProject, defaultBpm: n });
          }}
        />
      </label>
      <label className={styles.inspField}>
        Metrum domyślne
        <input
          className={styles.lengthInput}
          type="text"
          inputMode="numeric"
          placeholder="4/4"
          defaultValue={`${draftProject.defaultMeter.numerator}/${draftProject.defaultMeter.denominator}`}
          key={`meter-${draftProject.defaultMeter.numerator}-${draftProject.defaultMeter.denominator}`}
          aria-label="Metrum domyślne"
          onBlur={(e) => {
            const parsed = parseMeterString(
              e.target.value,
              draftProject.defaultMeter,
            );
            if (
              parsed.numerator === draftProject.defaultMeter.numerator &&
              parsed.denominator === draftProject.defaultMeter.denominator
            ) {
              e.target.value = `${parsed.numerator}/${parsed.denominator}`;
              return;
            }
            commitDraft(
              upsertMeterAt(
                draftProject,
                0,
                parsed.numerator,
                parsed.denominator,
              ),
            );
          }}
        />
      </label>
      <label className={styles.inspField}>
        PC (MIDI)
        <input
          className={styles.lengthInput}
          type="number"
          min={0}
          max={127}
          value={draftProject.midiProgramId ?? ""}
          disabled={draftProject.isTemplate === true}
          aria-label="Program Change"
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n)) return;
            commitDraft({
              ...draftProject,
              midiProgramId: Math.max(0, Math.min(127, Math.round(n))),
            });
          }}
        />
      </label>
      <label className={styles.inspField}>
        Artysta
        <input
          className={styles.nameInput}
          value={draftProject.artist ?? ""}
          onChange={(e) =>
            commitDraft({
              ...draftProject,
              artist: e.target.value || undefined,
            })
          }
        />
      </label>
      <label className={styles.inspField}>
        Gatunek
        <input
          className={styles.nameInput}
          value={draftProject.genre ?? ""}
          onChange={(e) =>
            commitDraft({
              ...draftProject,
              genre: e.target.value || undefined,
            })
          }
        />
      </label>
      <label className={styles.inspField}>
        Okładka (URL)
        <input
          className={styles.nameInput}
          value={draftProject.coverUrl ?? ""}
          placeholder="https://…"
          aria-label="URL okładki"
          onChange={(e) =>
            commitDraft({
              ...draftProject,
              coverUrl: e.target.value.trim() || undefined,
            })
          }
        />
      </label>
      <label className={styles.inspField}>
        Rok wydania
        <input
          className={styles.lengthInput}
          type="number"
          min={1900}
          max={2100}
          placeholder="1978"
          value={draftProject.year ?? ""}
          aria-label="Rok wydania"
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              commitDraft({ ...draftProject, year: undefined });
              return;
            }
            const n = Number(raw);
            if (!Number.isFinite(n)) return;
            commitDraft({
              ...draftProject,
              year: Math.round(n),
            });
          }}
        />
      </label>
      <label className={styles.inspField}>
        Tonacja (start)
        <span className={styles.metaKeyRow}>
          <select
            className={styles.nameInput}
            aria-label="Tonika (start)"
            value={resolveKeyAt(draftProject, 0)?.tonic ?? "C"}
            onChange={(e) => {
              const mode = resolveKeyAt(draftProject, 0)?.mode ?? "major";
              commitDraft(
                upsertKeyAt(draftProject, 0, {
                  tonic: normalizeKeyTonic(e.target.value, "C"),
                  mode,
                }),
              );
            }}
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
            aria-label="Tryb (start)"
            value={resolveKeyAt(draftProject, 0)?.mode ?? "major"}
            onChange={(e) => {
              const tonic = resolveKeyAt(draftProject, 0)?.tonic ?? "C";
              const mode = e.target.value === "minor" ? "minor" : "major";
              commitDraft(upsertKeyAt(draftProject, 0, { tonic, mode }));
            }}
          >
            <option value="major">Dur</option>
            <option value="minor">Moll</option>
          </select>
        </span>
      </label>
      <div className={styles.inspField}>
        Import (nadpisuje bieżący utwór)
        <div className={styles.metaKeyRow}>
          <Button
            type="button"
            variant="primary"
            onClick={() => openSongImportWizard(false)}
          >
            Importuj…
          </Button>
        </div>
      </div>
    </div>
  );
}
