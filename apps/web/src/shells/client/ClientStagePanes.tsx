import type { Dispatch, SetStateAction } from "react";
import type { Project } from "@stagesync/shared";
import { putProject } from "@lib/shell-operator/libraryApi.js";
import type { ClientDisplayPrefs } from "@lib/client/clientDisplayPrefs.js";
import { applyVocalTap, vocalTapQueue } from "@lib/client/clientVocalTap.js";
import {
  saveScoreHiddenParts,
  saveScoreOctave,
  type ScoreOctave,
  type ScorePartInfo,
} from "@lib/timeline-edit/scoreOsmd.js";
import { SettingsPopover, SettingsPopoverAnchor } from "../SettingsPopover.js";
import { ShellIconButton } from "../ShellIconButton.js";
import { IconMixer } from "../icons.js";
import styles from "../ClientShell.module.css";
import { RoleSettingsFields } from "./ClientSettingsFields.js";
import { CLIENT_ROLES, type ClientRoleId } from "./clientRoles.js";
import { DrumsPane } from "./DrumsPane.js";
import { GridPane } from "./GridPane.js";
import { KaraokePane } from "./KaraokePane.js";
import { ScorePane } from "./ScorePane.js";

export function ClientStagePanes({
  picked,
  activeProject,
  displayTicks,
  projectLoading,
  activeProjectId,
  displayPrefs,
  setDisplayPrefs,
  liveDesk,
  vocalTapOn,
  setVocalTapOn,
  vocalTapIndex,
  setVocalTapIndex,
  setActiveProject,
  setDrumsNoteError,
  roleSettings,
  setRoleSettings,
  toggleRoleSettings,
  scoreZoom,
  setScoreZoom,
  scoreFollowPlayhead,
  setScoreFollowPlayhead,
  scoreOctave,
  setScoreOctave,
  scoreParts,
  setScoreParts,
  scoreHiddenPartIds,
  setScoreHiddenPartIds,
  seek,
}: {
  picked: ClientRoleId[];
  activeProject: Project | null;
  displayTicks: number;
  projectLoading: boolean;
  activeProjectId: string | null | undefined;
  displayPrefs: ClientDisplayPrefs;
  setDisplayPrefs: Dispatch<SetStateAction<ClientDisplayPrefs>>;
  liveDesk: { clientEditEnabled: boolean; transpositionSemitones: number };
  vocalTapOn: boolean;
  setVocalTapOn: (v: boolean) => void;
  vocalTapIndex: number;
  setVocalTapIndex: Dispatch<SetStateAction<number>>;
  setActiveProject: (p: Project) => void;
  setDrumsNoteError: (v: string | null) => void;
  roleSettings: ClientRoleId | null;
  setRoleSettings: (v: ClientRoleId | null) => void;
  toggleRoleSettings: (id: ClientRoleId) => void;
  scoreZoom: number;
  setScoreZoom: (v: number) => void;
  scoreFollowPlayhead: boolean;
  setScoreFollowPlayhead: (v: boolean) => void;
  scoreOctave: ScoreOctave;
  setScoreOctave: (v: ScoreOctave) => void;
  scoreParts: ScorePartInfo[];
  setScoreParts: Dispatch<SetStateAction<ScorePartInfo[]>>;
  scoreHiddenPartIds: string[];
  setScoreHiddenPartIds: Dispatch<SetStateAction<string[]>>;
  seek: (ticks: number) => void | Promise<void>;
}) {
  return (
      <div
        className={[styles.stage, picked.length === 2 ? styles.stageSplit : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {picked.map((id) => {
          const role = CLIENT_ROLES.find((r) => r.id === id)!;
          return (
            <section
              key={id}
              className={styles.rolePane}
              aria-label={role.label}
            >
              {/* Role display prefs: v4 view-settings sliders (not global gear) */}
              <SettingsPopoverAnchor className={styles.roleSettings}>
                <ShellIconButton
                  label={`Ustawienia ${role.label}`}
                  aria-expanded={roleSettings === id}
                  aria-controls={`role-settings-${id}`}
                  onClick={() => toggleRoleSettings(id)}
                >
                  <IconMixer />
                </ShellIconButton>
                {roleSettings === id ? (
                  <SettingsPopover
                    id={`role-settings-${id}`}
                    title={role.label}
                    onClose={() => setRoleSettings(null)}
                  >
                    <RoleSettingsFields
                      role={id}
                      prefs={displayPrefs}
                      onPrefsChange={setDisplayPrefs}
                      vocalTapOn={vocalTapOn}
                      onVocalTapToggle={(on) => {
                        setVocalTapOn(on);
                        setVocalTapIndex(0);
                      }}
                      scoreZoom={scoreZoom}
                      onScoreZoomChange={setScoreZoom}
                      scoreFollowPlayhead={scoreFollowPlayhead}
                      onScoreFollowPlayheadChange={setScoreFollowPlayhead}
                      scoreOctave={scoreOctave}
                      onScoreOctaveChange={(next) => {
                        setScoreOctave(next);
                        if (activeProject?.id) {
                          saveScoreOctave(activeProject.id, next);
                        }
                      }}
                      scoreParts={scoreParts}
                      scoreHiddenPartIds={scoreHiddenPartIds}
                      onScorePartVisible={(partId, visible) => {
                        setScoreHiddenPartIds((prev) => {
                          let next = visible
                            ? prev.filter((pid) => pid !== partId)
                            : prev.includes(partId)
                              ? prev
                              : [...prev, partId];
                          if (
                            scoreParts.length > 0 &&
                            next.length >= scoreParts.length
                          ) {
                            next = scoreParts
                              .filter((p) => p.id !== partId)
                              .map((p) => p.id);
                          }
                          if (activeProject?.id) {
                            saveScoreHiddenParts(activeProject.id, next);
                          }
                          return next;
                        });
                      }}
                    />
                  </SettingsPopover>
                ) : null}
              </SettingsPopoverAnchor>
              {id === "drums" ? (
                activeProject ? (
                  <DrumsPane
                    project={activeProject}
                    displayTicks={displayTicks}
                    notesEdit={
                      displayPrefs.formNotesEdit && liveDesk.clientEditEnabled
                    }
                    sectionNamesPolish={displayPrefs.sectionNamesPolish}
                    onNoteChange={(clipId, note) => {
                      if (!activeProjectId || !liveDesk.clientEditEnabled)
                        return;
                      const prev = activeProject;
                      const next: Project = {
                        ...activeProject,
                        forma: {
                          clips: activeProject.forma.clips.map((c) =>
                            c.id === clipId
                              ? {
                                  ...c,
                                  note: note.length > 0 ? note : undefined,
                                }
                              : c,
                          ),
                        },
                      };
                      setDrumsNoteError(null);
                      setActiveProject(next);
                      void putProject(activeProjectId, next)
                        .then((saved) => setActiveProject(saved))
                        .catch((err) => {
                          setActiveProject(prev);
                          setDrumsNoteError(
                            err instanceof Error
                              ? err.message
                              : "Nie udało się zapisać notatki perkusji",
                          );
                        });
                    }}
                  />
                ) : (
                  <p className={styles.empty}>
                    {activeProjectId
                      ? projectLoading
                        ? "Wczytywanie utworu…"
                        : "Nie udało się wczytać utworu."
                      : "Oczekiwanie na utwór…"}
                  </p>
                )
              ) : id === "karaoke" ? (
                <KaraokePane
                  project={activeProject}
                  displayTicks={displayTicks}
                  loading={projectLoading}
                  hasActiveProjectId={Boolean(activeProjectId)}
                  prefs={displayPrefs}
                  vocalTapOn={vocalTapOn && liveDesk.clientEditEnabled}
                  vocalTapIndex={vocalTapIndex}
                  onVocalTap={() => {
                    if (
                      !activeProject ||
                      !activeProjectId ||
                      !liveDesk.clientEditEnabled
                    )
                      return;
                    const queue = vocalTapQueue(activeProject);
                    const clip = queue[vocalTapIndex];
                    if (!clip) {
                      setVocalTapOn(false);
                      return;
                    }
                    const next = applyVocalTap(
                      activeProject,
                      clip.id,
                      displayTicks,
                    );
                    setActiveProject(next);
                    void putProject(activeProjectId, next)
                      .then(() => {
                        const qi = vocalTapIndex + 1;
                        if (qi >= queue.length) {
                          setVocalTapOn(false);
                          setVocalTapIndex(0);
                        } else {
                          setVocalTapIndex(qi);
                        }
                      })
                      .catch(() => undefined);
                  }}
                  onVocalTapStep={(dir) => {
                    if (!activeProject) return;
                    const queue = vocalTapQueue(activeProject);
                    const max = Math.max(0, queue.length - 1);
                    setVocalTapIndex((i) =>
                      Math.max(0, Math.min(max, i + dir)),
                    );
                  }}
                />
              ) : id === "grid" ? (
                <GridPane
                  project={activeProject}
                  displayTicks={displayTicks}
                  loading={projectLoading}
                  hasActiveProjectId={Boolean(activeProjectId)}
                  prefs={displayPrefs}
                  teamSemitones={liveDesk.transpositionSemitones}
                />
              ) : id === "score" ? (
                <ScorePane
                  project={activeProject}
                  loading={projectLoading}
                  hasActiveProjectId={Boolean(activeProjectId)}
                  displayTicks={displayTicks}
                  scoreZoom={scoreZoom}
                  followPlayhead={scoreFollowPlayhead}
                  scoreOctave={scoreOctave}
                  hiddenPartIds={scoreHiddenPartIds}
                  onPartsChange={setScoreParts}
                  teamSemitones={liveDesk.transpositionSemitones}
                  instrumentPitch={displayPrefs.instrumentPitch}
                  instrumentPitchManual={displayPrefs.instrumentPitchManual}
                  onSeek={(ticks) => {
                    void seek(ticks);
                  }}
                />
              ) : (
                <p className={styles.empty}>Oczekiwanie na utwór…</p>
              )}
            </section>
          );
        })}
        {picked.length === 2 ? (
          <div className={styles.divider} aria-hidden />
        ) : null}
      </div>
  );
}
