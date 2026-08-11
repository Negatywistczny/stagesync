import React from "react";
import type { Project, CueClip } from "@stagesync/shared";
import {
  setCueClipLabel,
  setCueClipRoles,
  setCueClipPriority,
  setCueClipSample,
  CUE_ROLES,
} from "@lib/timeline-edit/cueEdit.js";
import { fireCueSampleGo } from "@lib/audio/audioPlayback.js";
import {
  clampBeatForProject,
  formatStartBarBeat,
  moveClipStartKeepLength,
  parseStartBarBeat,
} from "@lib/timeline/clipStartEdit.js";
import styles from "../TimelineShell.module.css";

export function CueClipInspector({
  draftProject,
  commitDraft,
  selectedCueClip,
  displayTicks,
  projectId,
}: {
  draftProject: Project | null;
  commitDraft: (next: Project) => void;
  selectedCueClip: CueClip;
  displayTicks: number;
  projectId: string | null;
}) {
  return (
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
              setCueClipLabel(draftProject, selectedCueClip.id, e.target.value),
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
                      setCueClipRoles(draftProject, selectedCueClip.id, next),
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
  );
}
