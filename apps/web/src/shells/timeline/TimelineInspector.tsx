import React, { useRef } from "react";
import { Button, Slider } from "@stagesync/ui";
import {
  resolveKeyAt,
  type Project,
  normalizeKeyTonic,
  parseMeterString,
  type FormaClip,
  type TekstClip,
  type AkordClip,
  type CueClip,
  type ScoreBarAnchor,
  type AudioClip,
  type AudioTrack,
} from "@stagesync/shared";
import {
  upsertKeyAt,
  upsertMeterAt,
  type MapLaneId,
} from "@lib/timeline/mapLaneEdit.js";
import {
  addFormaSubsection,
  countdownBars,
  deleteFormaSubsection,
  setFormaSubsectionStartBar,
} from "@lib/timeline-edit/formaInspector.js";
import {
  setTekstClipStart,
  setTekstClipText,
} from "@lib/timeline-edit/tekstEdit.js";
import {
  commitAkordyClipSymbol,
  setAkordyClipSymbol,
} from "@lib/timeline-edit/akordyEdit.js";
import {
  setCueClipLabel,
  setCueClipRoles,
  setCueClipPriority,
  setCueClipSample,
  CUE_ROLES,
} from "@lib/timeline-edit/cueEdit.js";
import { updateScoreAnchor } from "@lib/timeline-edit/scoreBarEdit.js";
import {
  setAudioClipFadeMs,
  setAudioClipGainDb,
  setAudioClipLoop,
  setAudioClipMuted,
  setAudioClipTrimMs,
  setAudioTrackGainDb,
  setAudioTrackName,
} from "@lib/audio/audioLaneEdit.js";
import { fireCueSampleGo } from "@lib/audio/audioPlayback.js";
import {
  clampBeatForProject,
  formatStartBarBeat,
  moveClipStartKeepLength,
  parseStartBarBeat,
  ticksFromDisplayBarBeat,
} from "@lib/timeline/clipStartEdit.js";
import { TaperGainSlider } from "./channelStrip/TaperGainSlider.js";
import { IconClose } from "../icons.js";
import { ShellIconButton } from "../ShellIconButton.js";
import styles from "../TimelineShell.module.css";
import type { ClipSelectionLane } from "@lib/timeline/timelineSelection.js";

interface TimelineInspectorProps {
  inspectorOpen: boolean;
  closeInspectorPanel: () => void;
  clipSelectionItemsLength: number;
  selectionLane: ClipSelectionLane | null;
  songMetaOpen: boolean;
  draftProject: Project | null;
  commitDraft: (next: Project) => void;
  openSongImportWizard: (asNew: boolean) => void;
  selectedMapLane: MapLaneId | null;
  selectedMapIds: string[];
  primaryMapId: string | null;
  selectedTekstClip: TekstClip | null;
  selectedAkordClip: AkordClip | null;
  selectedCueClip: CueClip | null;
  selectedAnchor: ScoreBarAnchor | null;
  selectedAudioClip: AudioClip | null;
  selectedDockAudioTrack: AudioTrack | null;
  selectedClip: FormaClip | null;
  selectedSubsectionRows: { index: number; startDisplayBar: number }[];
  selectedSubsectionIdx: number | null;
  setSelectedSubsectionIdx: (idx: number | null) => void;
  onClipRename: (name: string) => void;
  onCountdownBarsChange: (raw: string) => void;
  audioUploadPending: boolean;
  onUploadAudioToTrack: (trackId: string, file: File) => Promise<void>;
  displayTicks: number;
  projectId: string | null;
}

export function TimelineInspector({
  inspectorOpen,
  closeInspectorPanel,
  clipSelectionItemsLength,
  selectionLane,
  songMetaOpen,
  draftProject,
  commitDraft,
  openSongImportWizard,
  selectedMapLane,
  selectedMapIds,
  primaryMapId,
  selectedTekstClip,
  selectedAkordClip,
  selectedCueClip,
  selectedAnchor,
  selectedAudioClip,
  selectedDockAudioTrack,
  selectedClip,
  selectedSubsectionRows,
  selectedSubsectionIdx,
  setSelectedSubsectionIdx,
  onClipRename,
  onCountdownBarsChange,
  audioUploadPending,
  onUploadAudioToTrack,
  displayTicks,
  projectId,
}: TimelineInspectorProps) {
  const inspAudioFileRef = useRef<HTMLInputElement>(null);

  return (
    <aside
      className={[styles.inspector, inspectorOpen ? styles.inspectorOpen : ""]
        .filter(Boolean)
        .join(" ")}
      aria-label="Właściwości"
      aria-hidden={!inspectorOpen ? true : undefined}
    >
      <div className={styles.inspHead}>
        <h2 className={styles.inspTitle}>Właściwości</h2>
        <span className={styles.inspClose}>
          <ShellIconButton
            label="Zamknij właściwości"
            onClick={closeInspectorPanel}
          >
            <IconClose />
          </ShellIconButton>
        </span>
      </div>
      {clipSelectionItemsLength > 1 ? (
        <p className={styles.inspMulti} role="status" aria-live="polite">
          Zaznaczono {clipSelectionItemsLength} klipów
          {selectionLane
            ? ` · ${
                selectionLane === "forma"
                  ? "Forma"
                  : selectionLane === "tekst"
                    ? "Tekst"
                    : selectionLane === "akordy"
                      ? "Akordy"
                      : selectionLane === "cue"
                        ? "Cue"
                        : "Audio"
              }`
            : ""}
        </p>
      ) : null}
      {songMetaOpen && draftProject ? (
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
      ) : selectedMapLane && selectedMapIds.length > 0 ? (
        <div className={styles.inspBody}>
          <p className={styles.inspMulti} role="status" aria-live="polite">
            Zaznaczono {selectedMapIds.length} ·{" "}
            {selectedMapLane === "tempo"
              ? "Tempo"
              : selectedMapLane === "metrum"
                ? "Metrum"
                : "Tonacja"}
            {selectedMapIds.length > 1
              ? " · edycja: klik bez multi / Delete"
              : " · klik = edycja wartości"}
          </p>
          {primaryMapId ? (
            <p>
              Aktywny event:{" "}
              <span className={styles.metaRead}>{primaryMapId}</span>
            </p>
          ) : null}
        </div>
      ) : selectedTekstClip ? (
        <div className={styles.inspBody}>
          <label className={styles.inspField}>
            Tekst linii
            <textarea
              className={styles.nameInput}
              value={selectedTekstClip.text}
              aria-label="Tekst linii"
              rows={3}
              onChange={(e) => {
                if (!draftProject) return;
                commitDraft(
                  setTekstClipText(
                    draftProject,
                    selectedTekstClip.id,
                    e.target.value,
                  ),
                );
              }}
            />
          </label>
          <label className={styles.inspField}>
            Start (takt.beat)
            <input
              className={styles.nameInput}
              defaultValue={formatStartBarBeat(
                draftProject!,
                selectedTekstClip.startTicks,
              )}
              key={`tekst-start-${selectedTekstClip.id}-${selectedTekstClip.startTicks}`}
              aria-label="Start tekstu (takt.beat)"
              onBlur={(e) => {
                if (!draftProject) return;
                const parsed = parseStartBarBeat(e.target.value);
                if (!parsed) return;
                const beat = clampBeatForProject(
                  draftProject,
                  parsed.bar,
                  parsed.beat,
                );
                const startTicks = ticksFromDisplayBarBeat(
                  draftProject,
                  parsed.bar,
                  beat,
                );
                commitDraft(
                  setTekstClipStart(
                    draftProject,
                    selectedTekstClip.id,
                    startTicks,
                  ),
                );
              }}
            />
          </label>
          <p>
            start {selectedTekstClip.startTicks}, długość{" "}
            {selectedTekstClip.lengthTicks} ticks
          </p>
        </div>
      ) : selectedAkordClip ? (
        <div className={styles.inspBody}>
          <label className={styles.inspField}>
            Symbol akordu
            <input
              className={styles.nameInput}
              value={selectedAkordClip.symbol}
              aria-label="Symbol akordu"
              onChange={(e) => {
                if (!draftProject) return;
                commitDraft(
                  setAkordyClipSymbol(
                    draftProject,
                    selectedAkordClip.id,
                    e.target.value,
                  ),
                );
              }}
              onBlur={(e) => {
                if (!draftProject) return;
                commitDraft(
                  commitAkordyClipSymbol(
                    draftProject,
                    selectedAkordClip.id,
                    e.target.value,
                  ),
                );
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                (e.currentTarget as HTMLInputElement).blur();
              }}
            />
          </label>
          <label className={styles.inspField}>
            Start (takt.beat)
            <input
              className={styles.nameInput}
              defaultValue={formatStartBarBeat(
                draftProject!,
                selectedAkordClip.startTicks,
              )}
              key={`akord-start-${selectedAkordClip.id}-${selectedAkordClip.startTicks}`}
              aria-label="Start akordu (takt.beat)"
              onBlur={(e) => {
                if (!draftProject) return;
                const parsed = parseStartBarBeat(e.target.value);
                if (!parsed) return;
                const beat = clampBeatForProject(
                  draftProject,
                  parsed.bar,
                  parsed.beat,
                );
                commitDraft({
                  ...draftProject,
                  akordy: {
                    clips: moveClipStartKeepLength(
                      draftProject,
                      draftProject.akordy.clips,
                      selectedAkordClip.id,
                      parsed.bar,
                      beat,
                    ),
                  },
                });
              }}
            />
          </label>
          <p>
            start {selectedAkordClip.startTicks}, długość{" "}
            {selectedAkordClip.lengthTicks} ticks
          </p>
        </div>
      ) : selectedCueClip ? (
        <div className={styles.inspBody}>
          <label className={styles.inspField}>
            Etykieta cue
            <input
              className={styles.nameInput}
              value={selectedCueClip.label}
              aria-label="Etykieta cue"
              onChange={(e) => {
                if (!draftProject) return;
                commitDraft(
                  setCueClipLabel(
                    draftProject,
                    selectedCueClip.id,
                    e.target.value,
                  ),
                );
              }}
            />
          </label>
          <fieldset className={styles.inspFieldset}>
            <legend>Role (puste = wszyscy)</legend>
            <div className={styles.inspChecks}>
              {CUE_ROLES.map((role) => {
                const on = (selectedCueClip.roles ?? []).includes(role);
                return (
                  <label key={role} className={styles.inspCheck}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        if (!draftProject) return;
                        const cur = selectedCueClip.roles ?? [];
                        const next = on
                          ? cur.filter((r) => r !== role)
                          : [...cur, role];
                        commitDraft(
                          setCueClipRoles(
                            draftProject,
                            selectedCueClip.id,
                            next,
                          ),
                        );
                      }}
                    />
                    {role}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <label className={styles.inspField}>
            Priorytet
            <select
              className={styles.nameInput}
              value={selectedCueClip.priority ?? "normal"}
              aria-label="Priorytet cue"
              onChange={(e) => {
                if (!draftProject) return;
                const v = e.target.value === "alert" ? "alert" : "normal";
                commitDraft(
                  setCueClipPriority(draftProject, selectedCueClip.id, v),
                );
              }}
            >
              <option value="normal">Normal</option>
              <option value="alert">Alert</option>
            </select>
          </label>
          <fieldset className={styles.inspFieldset}>
            <legend>Sampler</legend>
            <label className={styles.inspField}>
              Asset audio
              <select
                className={styles.nameInput}
                aria-label="Cue sample asset"
                value={selectedCueClip.sample?.assetId ?? ""}
                onChange={(e) => {
                  if (!draftProject) return;
                  const assetId = e.target.value;
                  if (!assetId) {
                    commitDraft(
                      setCueClipSample(draftProject, selectedCueClip.id, null),
                    );
                    return;
                  }
                  commitDraft(
                    setCueClipSample(draftProject, selectedCueClip.id, {
                      ...(selectedCueClip.sample ?? {}),
                      assetId,
                    }),
                  );
                }}
              >
                <option value="">— brak —</option>
                {draftProject!.assets
                  .filter((a) => a.kind === "audio")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.originalName}
                    </option>
                  ))}
              </select>
            </label>
            {selectedCueClip.sample ? (
              <>
                <label className={styles.inspField}>
                  Tryb
                  <select
                    className={styles.nameInput}
                    aria-label="Cue sample mode"
                    value={selectedCueClip.sample.mode ?? "one-shot"}
                    onChange={(e) => {
                      if (!draftProject || !selectedCueClip.sample) return;
                      const mode =
                        e.target.value === "gated" ? "gated" : "one-shot";
                      commitDraft(
                        setCueClipSample(draftProject, selectedCueClip.id, {
                          ...selectedCueClip.sample,
                          mode,
                        }),
                      );
                    }}
                  >
                    <option value="one-shot">One-shot</option>
                    <option value="gated">Gated</option>
                  </select>
                </label>
                <label className={styles.inspField}>
                  Out
                  <select
                    className={styles.nameInput}
                    aria-label="Cue sample output"
                    value={
                      selectedCueClip.sample.output?.kind === "bus"
                        ? `bus:${selectedCueClip.sample.output.busId}`
                        : selectedCueClip.sample.output?.kind === "hw_out"
                          ? `hw:${selectedCueClip.sample.output.hwOutputId}`
                          : "master"
                    }
                    onChange={(e) => {
                      if (!draftProject || !selectedCueClip.sample) return;
                      const v = e.target.value;
                      const output =
                        v.startsWith("hw:") && v.length > 3
                          ? {
                              kind: "hw_out" as const,
                              hwOutputId: v.slice(3),
                            }
                          : v.startsWith("bus:") && v.length > 4
                            ? {
                                kind: "bus" as const,
                                busId: v.slice(4),
                              }
                            : { kind: "master" as const };
                      commitDraft(
                        setCueClipSample(draftProject, selectedCueClip.id, {
                          ...selectedCueClip.sample,
                          output,
                        }),
                      );
                    }}
                  >
                    <option value="master">Master</option>
                    {(draftProject!.audioBusses ?? []).map((b) => (
                      <option key={b.id} value={`bus:${b.id}`}>
                        {b.name}
                      </option>
                    ))}
                    {(draftProject!.audioHardwareOutputs ?? []).map((h) => (
                      <option key={h.id} value={`hw:${h.id}`}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.inspCheck}>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedCueClip.sample.playPostStop)}
                    onChange={(e) => {
                      if (!draftProject || !selectedCueClip.sample) return;
                      commitDraft(
                        setCueClipSample(draftProject, selectedCueClip.id, {
                          ...selectedCueClip.sample,
                          playPostStop: e.target.checked || undefined,
                        }),
                      );
                    }}
                  />
                  Graj po Stop
                </label>
                <button
                  type="button"
                  className={styles.nameInput}
                  onClick={() => {
                    if (!draftProject || !projectId) return;
                    void fireCueSampleGo(
                      projectId,
                      draftProject,
                      selectedCueClip.id,
                      displayTicks,
                    );
                  }}
                >
                  GO
                </button>
              </>
            ) : null}
          </fieldset>
          <label className={styles.inspField}>
            Start (takt.beat)
            <input
              className={styles.nameInput}
              defaultValue={formatStartBarBeat(
                draftProject!,
                selectedCueClip.startTicks,
              )}
              key={`cue-start-${selectedCueClip.id}-${selectedCueClip.startTicks}`}
              aria-label="Start cue (takt.beat)"
              onBlur={(e) => {
                if (!draftProject) return;
                const parsed = parseStartBarBeat(e.target.value);
                if (!parsed) return;
                const beat = clampBeatForProject(
                  draftProject,
                  parsed.bar,
                  parsed.beat,
                );
                commitDraft({
                  ...draftProject,
                  cue: {
                    clips: moveClipStartKeepLength(
                      draftProject,
                      draftProject.cue.clips,
                      selectedCueClip.id,
                      parsed.bar,
                      beat,
                    ),
                  },
                });
              }}
            />
          </label>
          <p>
            start {selectedCueClip.startTicks}, długość{" "}
            {selectedCueClip.lengthTicks} ticks
          </p>
        </div>
      ) : selectedAnchor ? (
        <div className={styles.inspBody}>
          <p>
            Kotwica {selectedAnchor.logicBar} → {selectedAnchor.scoreBar}
          </p>
          <label className={styles.inspField}>
            Takt utworu (logicBar)
            <input
              className={styles.lengthInput}
              type="number"
              min={1}
              value={selectedAnchor.logicBar}
              onChange={(e) => {
                if (!draftProject) return;
                const n = Number.parseInt(e.target.value, 10);
                if (!Number.isFinite(n)) return;
                commitDraft(
                  updateScoreAnchor(draftProject, selectedAnchor.id, {
                    logicBar: n,
                  }),
                );
              }}
            />
          </label>
          <label className={styles.inspField}>
            Takt partytury (scoreBar)
            <input
              className={styles.lengthInput}
              type="number"
              min={1}
              value={selectedAnchor.scoreBar}
              onChange={(e) => {
                if (!draftProject) return;
                const n = Number.parseInt(e.target.value, 10);
                if (!Number.isFinite(n)) return;
                commitDraft(
                  updateScoreAnchor(draftProject, selectedAnchor.id, {
                    scoreBar: n,
                  }),
                );
              }}
            />
          </label>
        </div>
      ) : selectedAudioClip ? (
        <div className={styles.inspBody}>
          <p className={styles.muted}>Klip audio</p>
          <p className={styles.muted}>
            {draftProject?.assets.find(
              (a) => a.id === selectedAudioClip.assetId,
            )?.originalName ?? "Audio"}
          </p>
          <label className={styles.inspField}>
            <input
              type="checkbox"
              checked={Boolean(selectedAudioClip.muted)}
              onChange={(e) => {
                if (!draftProject) return;
                commitDraft(
                  setAudioClipMuted(
                    draftProject,
                    selectedAudioClip.id,
                    e.target.checked,
                  ),
                );
              }}
            />{" "}
            Wycisz klip
          </label>
          <label className={styles.inspField}>
            Trim początku (ms)
            <input
              className={styles.lengthInput}
              type="number"
              min={0}
              step={1}
              value={selectedAudioClip.trimInMs ?? 0}
              onChange={(e) => {
                if (!draftProject) return;
                const n = Number(e.target.value);
                if (!Number.isFinite(n) || n < 0) return;
                commitDraft(
                  setAudioClipTrimMs(draftProject, selectedAudioClip.id, {
                    trimInMs: n,
                  }),
                );
              }}
            />
          </label>
          <label className={styles.inspField}>
            Trim końca (ms)
            <input
              className={styles.lengthInput}
              type="number"
              min={0}
              step={1}
              value={selectedAudioClip.trimOutMs ?? 0}
              onChange={(e) => {
                if (!draftProject) return;
                const n = Number(e.target.value);
                if (!Number.isFinite(n) || n < 0) return;
                commitDraft(
                  setAudioClipTrimMs(draftProject, selectedAudioClip.id, {
                    trimOutMs: n,
                  }),
                );
              }}
            />
          </label>
          <label className={styles.inspField}>
            Gain klipu (dB)
            <Slider
              aria-label="Gain klipu"
              min={-24}
              max={12}
              step={0.5}
              value={selectedAudioClip.gainDb ?? 0}
              onValueChange={(v: number) => {
                if (!draftProject) return;
                commitDraft(
                  setAudioClipGainDb(draftProject, selectedAudioClip.id, v),
                );
              }}
            />
          </label>
          <label className={styles.inspField}>
            Fade In (ms)
            <Slider
              aria-label="Fade In"
              min={0}
              max={2000}
              step={10}
              value={selectedAudioClip.fadeInMs ?? 0}
              onValueChange={(v: number) => {
                if (!draftProject) return;
                commitDraft(
                  setAudioClipFadeMs(draftProject, selectedAudioClip.id, {
                    fadeInMs: v,
                  }),
                );
              }}
            />
          </label>
          <label className={styles.inspField}>
            Fade Out (ms)
            <Slider
              aria-label="Fade Out"
              min={0}
              max={2000}
              step={10}
              value={selectedAudioClip.fadeOutMs ?? 0}
              onValueChange={(v: number) => {
                if (!draftProject) return;
                commitDraft(
                  setAudioClipFadeMs(draftProject, selectedAudioClip.id, {
                    fadeOutMs: v,
                  }),
                );
              }}
            />
          </label>
          <label className={styles.inspField}>
            <input
              type="checkbox"
              checked={Boolean(selectedAudioClip.loop)}
              onChange={(e) => {
                if (!draftProject) return;
                commitDraft(
                  setAudioClipLoop(
                    draftProject,
                    selectedAudioClip.id,
                    e.target.checked,
                  ),
                );
              }}
            />{" "}
            Pętla
          </label>
        </div>
      ) : selectedDockAudioTrack ? (
        <div className={styles.inspBody}>
          <p className={styles.muted}>Ścieżka audio</p>
          <label className={styles.inspField}>
            Nazwa
            <input
              className={styles.nameInput}
              value={selectedDockAudioTrack.name}
              aria-label="Nazwa ścieżki"
              onChange={(e) => {
                if (!draftProject) return;
                commitDraft(
                  setAudioTrackName(
                    draftProject,
                    selectedDockAudioTrack.id,
                    e.target.value,
                  ),
                );
              }}
            />
          </label>
          <label className={styles.inspField}>
            Fader (dB)
            <div
              onDoubleClick={(e) => {
                e.preventDefault();
                if (!draftProject) return;
                commitDraft(
                  setAudioTrackGainDb(
                    draftProject,
                    selectedDockAudioTrack.id,
                    0,
                  ),
                );
              }}
              title="Dwuklik — 0.0 dB"
            >
              <TaperGainSlider
                aria-label="Fader ścieżki"
                gainDb={selectedDockAudioTrack.gainDb ?? 0}
                onGainChange={(v: number) => {
                  if (!draftProject) return;
                  commitDraft(
                    setAudioTrackGainDb(
                      draftProject,
                      selectedDockAudioTrack.id,
                      v,
                    ),
                  );
                }}
              />
            </div>
          </label>
          <div className={styles.inspField}>
            <input
              ref={inspAudioFileRef}
              type="file"
              accept="audio/*,.mp3,.wav,.aiff,.aif,.m4a,.flac,.ogg"
              hidden
              disabled={audioUploadPending}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) {
                  void onUploadAudioToTrack(selectedDockAudioTrack.id, f);
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              disabled={audioUploadPending}
              onClick={() => inspAudioFileRef.current?.click()}
            >
              {audioUploadPending ? "Przesyłanie…" : "Importuj plik"}
            </Button>
          </div>
        </div>
      ) : selectedClip ? (
        <div className={styles.inspBody}>
          {selectedClip.kind === "section" ? (
            <label className={styles.inspField}>
              Nazwa sekcji
              <input
                className={styles.nameInput}
                value={selectedClip.name}
                aria-label="Nazwa sekcji"
                onChange={(e) => onClipRename(e.target.value)}
              />
            </label>
          ) : (
            <p>
              <strong>{selectedClip.name}</strong> — zablokowany Countdown
            </p>
          )}
          {selectedClip.kind === "section" ? (
            <label className={styles.inspField}>
              Notatka (Client Forma)
              <textarea
                className={styles.nameInput}
                rows={2}
                value={selectedClip.note ?? ""}
                aria-label="Notatka sekcji"
                onChange={(e) => {
                  if (!draftProject || !selectedClip) return;
                  const note = e.target.value;
                  commitDraft({
                    ...draftProject,
                    forma: {
                      clips: draftProject.forma.clips.map((c) =>
                        c.id === selectedClip.id
                          ? {
                              ...c,
                              note: note.length > 0 ? note : undefined,
                            }
                          : c,
                      ),
                    },
                  });
                }}
              />
            </label>
          ) : null}
          {selectedClip.kind === "section" ? (
            <div className={styles.inspField}>
              <span>Podsekcje</span>
              <span className={styles.metaRead}>
                {selectedSubsectionRows.length}
              </span>
              <div className={styles.subEditor} aria-label="Podsekcje sekcji">
                {selectedSubsectionRows.length === 0 ? (
                  <div className={styles.metaRead}>Brak podsekcji</div>
                ) : (
                  selectedSubsectionRows.map((row) => {
                    const canDelete = selectedSubsectionRows.length >= 2;
                    const selected = selectedSubsectionIdx === row.index;
                    return (
                      <div
                        key={`sub-${row.index}`}
                        className={[
                          styles.subEditorRow,
                          selected ? styles.subEditorRowSelected : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setSelectedSubsectionIdx(row.index)}
                      >
                        <span
                          className={styles.subEditorIdx}
                          aria-hidden="true"
                        >
                          #{row.index + 1}
                        </span>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          className={styles.subEditorBar}
                          value={row.startDisplayBar}
                          disabled={row.index === 0}
                          title={
                            row.index === 0
                              ? "Start sekcji (zablokowany)"
                              : "Takt początkowy podsekcji"
                          }
                          aria-label={`Takt początkowy podsekcji ${row.index + 1}`}
                          onFocus={() => setSelectedSubsectionIdx(row.index)}
                          onChange={(e) => {
                            if (!draftProject || !selectedClip) return;
                            if (row.index === 0) return;
                            const next = setFormaSubsectionStartBar(
                              draftProject,
                              selectedClip.id,
                              row.index,
                              Number(e.target.value),
                            );
                            if (next !== draftProject) commitDraft(next);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          type="button"
                          className={styles.subEditorDel}
                          disabled={!canDelete}
                          title="Usuń podsekcję"
                          aria-label={`Usuń podsekcję ${row.index + 1}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!draftProject || !selectedClip) return;
                            const result = deleteFormaSubsection(
                              draftProject,
                              selectedClip.id,
                              row.index,
                            );
                            if (!result) return;
                            commitDraft(result.project);
                            setSelectedSubsectionIdx(result.selectIdx);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className={styles.subEditorAdd}
                  onClick={() => {
                    if (!draftProject || !selectedClip) return;
                    const result = addFormaSubsection(
                      draftProject,
                      selectedClip.id,
                    );
                    if (!result) return;
                    commitDraft(result.project);
                    setSelectedSubsectionIdx(result.selectIdx);
                  }}
                >
                  +
                </Button>
              </div>
            </div>
          ) : null}
          {selectedClip.kind === "countdown" ? (
            <label className={styles.inspField}>
              Długość (takty)
              <input
                className={styles.lengthInput}
                type="number"
                min={1}
                step={1}
                value={countdownBars(draftProject!, selectedClip)}
                aria-label="Długość Countdown w taktach"
                onChange={(e) => onCountdownBarsChange(e.target.value)}
              />
            </label>
          ) : (
            <p>
              start {selectedClip.startTicks}, długość{" "}
              {selectedClip.lengthTicks} ticks
            </p>
          )}
        </div>
      ) : (
        <p className={styles.inspBody}>
          Zaznacz clip Forma / Tekst / Akordy / Cue / Kotwice lub event mapy
          (Tempo / Metrum / Tonacja).
        </p>
      )}
    </aside>
  );
}
