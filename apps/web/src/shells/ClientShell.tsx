import { useEffect, useRef, useState, type FormEvent } from "react";
import { toggleAppFullscreen } from "../lib/desktopBridge.js";
import { Button } from "@stagesync/ui";
import {
  INSTRUMENT_PITCH_MANUAL_MAX,
  INSTRUMENT_PITCH_MANUAL_MIN,
  resolveMeterAt,
  resolveStageCueBanner,
  resolveTempoAt,
  stageCueBannerLabel,
  ticksToBbt,
  type InstrumentPitchMode,
  type Project,
  type StageCueBannerItem,
} from "@stagesync/shared";
import {
  loadClientDisplayPrefs,
  setFormNotesEdit,
  setGridAnimations,
  setHybridPolishB,
  setInstrumentPitch,
  setInstrumentPitchManual,
  setLiteralQuality,
  setSectionNamesPolish,
  type ClientDisplayPrefs,
} from "../lib/clientDisplayPrefs.js";
import {
  CLOCK_DISPLAY_CHANGED_EVENT,
  formatClockDisplay,
  getStoredClockDisplayFormat,
  type ClockDisplayFormat,
} from "../lib/clockDisplayPrefs.js";
import { applyVocalTap, vocalTapQueue } from "../lib/clientVocalTap.js";
import { putProject } from "../lib/libraryApi.js";
import { fetchSetlist } from "../lib/setlistApi.js";
import { setTekstClipText } from "../lib/tekstEdit.js";
import { ticksFromSyncLeadMs } from "../lib/syncLead.js";
import { useActiveProject } from "../lib/useActiveProject.js";
import { useTransport } from "../transport/useTransport.js";
import type { WsStatus } from "../transport/transportContext.js";
import { ConnectionIndicator } from "./ConnectionIndicator.js";
import { DrumsPane } from "./client/DrumsPane.js";
import { GridPane } from "./client/GridPane.js";
import { KaraokePane } from "./client/KaraokePane.js";
import { ScorePane } from "./client/ScorePane.js";
import {
  clampScoreOctave,
  loadScoreHiddenParts,
  loadScoreOctave,
  saveScoreHiddenParts,
  saveScoreOctave,
  type ScoreOctave,
  type ScorePartInfo,
} from "../lib/scoreOsmd.js";
import {
  SCORE_ZOOM_DEFAULT,
  SCORE_ZOOM_MAX,
  SCORE_ZOOM_MIN,
  SCORE_ZOOM_STEP,
  clampScoreZoom,
} from "../lib/scorePlayhead.js";
import { IconFullscreen, IconSettings } from "./icons.js";
import {
  SettingsPopover,
  SettingsPopoverAnchor,
  ShellAppearanceFields,
} from "./SettingsPopover.js";
import { ShellIconButton } from "./ShellIconButton.js";
import { ShellSwitchRow } from "./ShellSwitchRow.js";
import { ShellWordmark } from "./ShellWordmark.js";
import styles from "./ClientShell.module.css";

type RoleId = "karaoke" | "grid" | "score" | "drums";

const ROLES: { id: RoleId; label: string; icon: string }[] = [
  { id: "karaoke", label: "Tekst", icon: "🎤" },
  { id: "grid", label: "Akordy", icon: "🎹" },
  { id: "score", label: "Partytura", icon: "🎼" },
  { id: "drums", label: "Forma", icon: "🥁" },
];

export function ClientShell() {
  const [nameModal, setNameModal] = useState(true);
  const [name, setName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [picked, setPicked] = useState<RoleId[]>([]);
  const [started, setStarted] = useState(false);
  const [globalSettings, setGlobalSettings] = useState(false);
  const [roleSettings, setRoleSettings] = useState<RoleId | null>(null);
  const {
    state,
    displayTicks: rawDisplayTicks,
    wsStatus,
    latencyMs,
    stageCues,
    liveDesk,
    play,
    seek,
    commandPending,
    error: transportError,
    announcePresence,
  } = useTransport();
  const displayTicks =
    rawDisplayTicks +
    ticksFromSyncLeadMs(liveDesk.syncLeadMs, state.bpm, state.ppq);
  const headerBbt = ticksToBbt(displayTicks, state.timeSignature, state.ppq);
  const [clockFormat, setClockFormat] = useState<ClockDisplayFormat>(() =>
    getStoredClockDisplayFormat(),
  );
  const clockLabel = formatClockDisplay({
    ticks: displayTicks,
    bpm: state.bpm,
    timeSignature: state.timeSignature,
    ppq: state.ppq,
    format: clockFormat,
  });
  const {
    activeProject,
    setActiveProject,
    loading: projectLoading,
    reload: reloadActiveProject,
  } = useActiveProject(state.activeProjectId);
  const prevWsStatusRef = useRef(wsStatus);
  const [displayPrefs, setDisplayPrefs] = useState(loadClientDisplayPrefs);
  const [vocalTapOn, setVocalTapOn] = useState(false);
  const [vocalTapIndex, setVocalTapIndex] = useState(0);
  const [drumsNoteError, setDrumsNoteError] = useState<string | null>(null);
  const [wallClockMs, setWallClockMs] = useState(() => Date.now());
  const cueAlertSeenRef = useRef<Set<string>>(new Set());
  const [cueFlashId, setCueFlashId] = useState<string | null>(null);
  const [setlistIds, setSetlistIds] = useState<string[]>([]);
  const [setlistEnabled, setSetlistEnabled] = useState(false);
  const [scoreZoom, setScoreZoom] = useState(SCORE_ZOOM_DEFAULT);
  const [scoreFollowPlayhead, setScoreFollowPlayhead] = useState(true);
  const [scoreOctave, setScoreOctave] = useState<ScoreOctave>(0);
  const [scoreParts, setScoreParts] = useState<ScorePartInfo[]>([]);
  const [scoreHiddenPartIds, setScoreHiddenPartIds] = useState<string[]>([]);

  useEffect(() => {
    const projectId = activeProject?.id ?? state.activeProjectId;
    if (!projectId) {
      setScoreOctave(0);
      setScoreHiddenPartIds([]);
      setScoreParts([]);
      return;
    }
    setScoreOctave(loadScoreOctave(projectId));
    setScoreHiddenPartIds(loadScoreHiddenParts(projectId));
  }, [activeProject?.id, state.activeProjectId]);

  useEffect(() => {
    if (!started) return;
    announcePresence({
      displayName: name.trim() || null,
      roles: picked,
    });
  }, [started, name, picked, announcePresence]);

  useEffect(() => {
    const onClock = () => {
      setClockFormat(getStoredClockDisplayFormat());
    };
    window.addEventListener(CLOCK_DISPLAY_CHANGED_EVENT, onClock);
    return () => {
      window.removeEventListener(CLOCK_DISPLAY_CHANGED_EVENT, onClock);
    };
  }, []);

  // After WS reconnect, refetch project even if activeProjectId unchanged (#358).
  useEffect(() => {
    const prev = prevWsStatusRef.current;
    prevWsStatusRef.current = wsStatus;
    if (prev === "disconnected" && wsStatus === "connected") {
      void reloadActiveProject();
    }
  }, [wsStatus, reloadActiveProject]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const view = await fetchSetlist();
        if (cancelled) return;
        setSetlistIds(view.projectIds);
        setSetlistEnabled(view.enabled);
      } catch {
        if (!cancelled) {
          setSetlistIds([]);
          setSetlistEnabled(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.activeProjectId]);

  useEffect(() => {
    const id = window.setInterval(() => setWallClockMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const sessionCues = stageCues.filter((cue) => {
    if (cue.ttlMs === 0) return true;
    const ttl =
      typeof cue.ttlMs === "number" && Number.isFinite(cue.ttlMs) && cue.ttlMs > 0
        ? cue.ttlMs
        : 6000;
    return wallClockMs < cue.sentAtMs + ttl;
  });

  const cueMeter = activeProject
    ? resolveMeterAt(activeProject, displayTicks)
    : state.timeSignature;
  const cueBpm = activeProject
    ? resolveTempoAt(activeProject, displayTicks)
    : state.bpm;
  const { now: cueNow, next: cueNext } = resolveStageCueBanner({
    cueClips: activeProject?.cue.clips ?? [],
    sessionCues,
    playheadTicks: displayTicks,
    bpm: cueBpm,
    ppq: activeProject?.ppq ?? state.ppq,
    meter: cueMeter,
    activeRoles: picked,
  });

  useEffect(() => {
    if (!cueNow || cueNow.priority !== "alert") return;
    if (cueAlertSeenRef.current.has(cueNow.id)) return;
    cueAlertSeenRef.current.add(cueNow.id);
    setCueFlashId(cueNow.id);
    const t = window.setTimeout(() => setCueFlashId(null), 2200);
    return () => window.clearTimeout(t);
  }, [cueNow]);

  useEffect(() => {
    cueAlertSeenRef.current.clear();
  }, [state.activeProjectId]);

  const songTitle = activeProject?.name ?? "Brak utworu";
  const setlistIndex = state.activeProjectId
    ? setlistIds.indexOf(state.activeProjectId)
    : -1;
  const nextSetlistId: string | null =
    setlistEnabled &&
    setlistIndex >= 0 &&
    setlistIndex < setlistIds.length - 1
      ? (setlistIds[setlistIndex + 1] ?? null)
      : null;

  async function onFullscreen() {
    await toggleAppFullscreen();
  }

  async function onNextSong() {
    if (!nextSetlistId || commandPending) return;
    await play({ projectId: nextSetlistId });
  }

  function toggleRole(id: RoleId) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((r) => r !== id);
      if (prev.length >= 2) return [prev[1]!, id];
      return [...prev, id];
    });
  }

  function submitName(e: FormEvent) {
    e.preventDefault();
    const n = nameDraft.trim() || "Gość";
    setName(n);
    setNameModal(false);
  }

  function toggleGlobalSettings() {
    setRoleSettings(null);
    setGlobalSettings((open) => !open);
  }

  function toggleRoleSettings(id: RoleId) {
    setGlobalSettings(false);
    setRoleSettings((current) => (current === id ? null : id));
  }

  const headerProps = {
    wsStatus,
    latencyMs,
    started,
    songTitle,
    bbt: headerBbt,
    clockLabel,
    nextSetlistId,
    nextSongPending: commandPending,
    transportError,
    onNextSong: () => void onNextSong(),
    onFullscreen: () => void onFullscreen(),
    globalSettingsOpen: globalSettings,
    onToggleGlobalSettings: toggleGlobalSettings,
    onCloseGlobalSettings: () => setGlobalSettings(false),
    onBack: started ? () => setStarted(false) : undefined,
    displayPrefs,
    onDisplayPrefsChange: setDisplayPrefs,
  };

  if (nameModal) {
    return (
      <div className={styles.page}>
        <div className={styles.modal} role="dialog" aria-modal aria-labelledby="name-title">
          <div className={styles.modalConn}>
            <ConnectionIndicator status={wsStatus} latencyMs={latencyMs} />
          </div>
          {wsStatus === "disconnected" ? (
            <p className={styles.offlineBanner} role="status">
              Brak połączenia z serwerem. Próba ponownego łączenia…
            </p>
          ) : null}
          <h1 id="name-title" className={styles.modalTitle}>
            Witaj w StageSync
          </h1>
          <p className={styles.muted}>Podaj swoje imię lub nazwę tabletu.</p>
          <form onSubmit={submitName}>
            <input
              className={styles.input}
              maxLength={40}
              placeholder="np. Ania · saksofon"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              autoFocus
            />
            <Button variant="primary" type="submit">
              Dalej
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className={styles.page}>
        <ClientChrome {...headerProps} started={false} />
        {wsStatus === "disconnected" ? (
          <p className={styles.offlineBanner} role="status">
            Brak połączenia z serwerem. Próba ponownego łączenia…
          </p>
        ) : null}
        <main className={styles.welcome}>
          <div className={styles.welcomeHero}>
            <ShellWordmark className={styles.welcomeBrand} />
            <div className={styles.greetingRow}>
              <p className={styles.greeting}>Cześć, {name}</p>
              <button
                type="button"
                className={styles.changeNameBtn}
                aria-label="Zmień nazwę"
                title="Zmień nazwę"
                onClick={() => {
                  setNameDraft(name);
                  setNameModal(true);
                }}
              >
                <svg
                  className={styles.changeNameIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
            </div>
            <h1 className={styles.welcomeTitle}>
              Wybierz <span className={styles.welcomeAccent}>rolę</span>
            </h1>
          </div>

          <div className={styles.roleGrid}>
            {ROLES.map((r) => {
              const on = picked.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  className={[styles.roleTile, on ? styles.roleOn : ""]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={on}
                  onClick={() => toggleRole(r.id)}
                >
                  <span className={styles.roleIcon} aria-hidden>
                    {r.icon}
                  </span>
                  <strong className={styles.roleLabel}>{r.label}</strong>
                </button>
              );
            })}
          </div>

          <div className={styles.startBar}>
            <Button
              variant="primary"
              className={styles.startBtn}
              disabled={picked.length === 0}
              onClick={() => setStarted(true)}
            >
              {picked.length === 2
                ? "Rozpocznij widok dzielony"
                : "Rozpocznij"}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <ClientChrome {...headerProps} started />
      {wsStatus === "disconnected" ? (
        <p className={styles.offlineBanner} role="status">
          Brak połączenia z serwerem. Próba ponownego łączenia…
        </p>
      ) : null}

      {drumsNoteError ? (
        <p className={styles.liveSaveError} role="alert">
          {drumsNoteError}
        </p>
      ) : null}

      <div
        className={[
          styles.stage,
          picked.length === 2 ? styles.stageSplit : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {picked.map((id) => {
          const role = ROLES.find((r) => r.id === id)!;
          return (
            <section key={id} className={styles.rolePane} aria-label={role.label}>
              {/* Role settings float top-right like v4 view-settings-wrap — no title strip */}
              <SettingsPopoverAnchor className={styles.roleSettings}>
                <ShellIconButton
                  label={`Ustawienia ${role.label}`}
                  aria-expanded={roleSettings === id}
                  aria-controls={`role-settings-${id}`}
                  onClick={() => toggleRoleSettings(id)}
                >
                  <IconSettings />
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
                      if (!state.activeProjectId || !liveDesk.clientEditEnabled)
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
                      void putProject(state.activeProjectId, next)
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
                    {state.activeProjectId
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
                  hasActiveProjectId={Boolean(state.activeProjectId)}
                  prefs={displayPrefs}
                  teamSemitones={liveDesk.transpositionSemitones}
                  vocalTapOn={vocalTapOn && liveDesk.clientEditEnabled}
                  vocalTapIndex={vocalTapIndex}
                  linesEdit={liveDesk.clientEditEnabled}
                  onLineChange={(clipId, text) => {
                    if (
                      !activeProject ||
                      !state.activeProjectId ||
                      !liveDesk.clientEditEnabled
                    )
                      return;
                    const prev = activeProject;
                    const next = setTekstClipText(activeProject, clipId, text);
                    setActiveProject(next);
                    void putProject(state.activeProjectId, next)
                      .then((saved) => setActiveProject(saved))
                      .catch(() => setActiveProject(prev));
                  }}
                  onVocalTap={() => {
                    if (
                      !activeProject ||
                      !state.activeProjectId ||
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
                    void putProject(state.activeProjectId, next)
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
                  hasActiveProjectId={Boolean(state.activeProjectId)}
                  prefs={displayPrefs}
                  teamSemitones={liveDesk.transpositionSemitones}
                />
              ) : id === "score" ? (
                <ScorePane
                  project={activeProject}
                  loading={projectLoading}
                  hasActiveProjectId={Boolean(state.activeProjectId)}
                  displayTicks={displayTicks}
                  scoreZoom={scoreZoom}
                  followPlayhead={scoreFollowPlayhead}
                  scoreOctave={scoreOctave}
                  hiddenPartIds={scoreHiddenPartIds}
                  onPartsChange={setScoreParts}
                  teamSemitones={liveDesk.transpositionSemitones}
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

      <div
        className={styles.cueHost}
        data-empty={!cueNow && !cueNext ? "true" : undefined}
        aria-live="polite"
        aria-atomic="true"
      >
        <div className={styles.cueStack}>
          {cueNow ? (
            <CueToast
              item={cueNow}
              flash={cueFlashId === cueNow.id}
              styles={styles}
            />
          ) : null}
          {cueNext ? (
            <CueToast item={cueNext} flash={false} styles={styles} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CueToast({
  item,
  flash,
  styles: s,
}: {
  item: StageCueBannerItem;
  flash: boolean;
  styles: typeof styles;
}) {
  const className = [
    s.cueToast,
    item.slot === "upcoming" ? s.cueToastNext : s.cueToastNow,
    item.priority === "alert" && item.slot === "now" ? s.cueToastAlert : "",
    flash ? s.cueToastFlash : "",
    s.cueToastVisible,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className} role="status">
      <span className={s.cueToastLabel}>{stageCueBannerLabel(item)}</span>
      <span className={s.cueToastText}>{item.text}</span>
    </div>
  );
}

type ClientHeaderProps = {
  wsStatus: WsStatus;
  latencyMs: number | null;
  started: boolean;
  songTitle: string;
  bbt: { bar: number; beat: number };
  clockLabel: string;
  nextSetlistId: string | null;
  nextSongPending: boolean;
  transportError: string | null;
  onNextSong: () => void;
  onFullscreen: () => void;
  globalSettingsOpen: boolean;
  onToggleGlobalSettings: () => void;
  onCloseGlobalSettings: () => void;
  onBack?: () => void;
  displayPrefs: ClientDisplayPrefs;
  onDisplayPrefsChange: (prefs: ClientDisplayPrefs) => void;
};

function ClientChrome({
  wsStatus,
  latencyMs,
  started,
  songTitle,
  bbt,
  clockLabel,
  nextSetlistId,
  nextSongPending,
  transportError,
  onNextSong,
  onFullscreen,
  globalSettingsOpen,
  onToggleGlobalSettings,
  onCloseGlobalSettings,
  onBack,
  displayPrefs,
  onDisplayPrefsChange,
}: ClientHeaderProps) {
  return (
    <header className={styles.header}>
      <ShellWordmark
        onClick={started && onBack ? onBack : undefined}
        title={started && onBack ? "Powrót do wyboru ról" : undefined}
      />

      <div className={styles.metronome} aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={[
              styles.dot,
              wsStatus !== "disconnected" && i === bbt.beat
                ? styles.dotActive
                : "",
            ].join(" ")}
          />
        ))}
      </div>

      <strong className={styles.songTitle}>{songTitle}</strong>
      {started ? (
        <button
          type="button"
          className={styles.setlistNext}
          disabled={!nextSetlistId || nextSongPending}
          onClick={onNextSong}
          title="Następny utwór setlisty"
        >
          →następny
        </button>
      ) : null}
      {transportError ? (
        <span className={styles.transportError} role="alert">
          {transportError}
        </span>
      ) : null}
      <span className={styles.takt}>{clockLabel}</span>

      <div className={styles.headerActions}>
        <ConnectionIndicator status={wsStatus} latencyMs={latencyMs} />
        <SettingsPopoverAnchor>
          <ShellIconButton
            label="Ustawienia globalne"
            aria-expanded={globalSettingsOpen}
            aria-controls="global-settings-panel"
            onClick={onToggleGlobalSettings}
          >
            <IconSettings />
          </ShellIconButton>
          {globalSettingsOpen ? (
            <SettingsPopover
              id="global-settings-panel"
              title="Globalne"
              onClose={onCloseGlobalSettings}
            >
              <GlobalSettingsFields
                prefs={displayPrefs}
                onPrefsChange={onDisplayPrefsChange}
              />
            </SettingsPopover>
          ) : null}
        </SettingsPopoverAnchor>
        <ShellIconButton label="Pełny ekran" onClick={onFullscreen}>
          <IconFullscreen />
        </ShellIconButton>
      </div>
    </header>
  );
}

const PITCH_OPTIONS: {
  id: InstrumentPitchMode;
  icon: string;
  label: string;
  title: string;
  manualIcon?: boolean;
}[] = [
  { id: "concert", icon: "🎹", label: "C", title: "Strój koncertowy (C)" },
  {
    id: "bb",
    icon: "🎺",
    label: "B♭",
    title: "Instrument B♭ — korekta +2 półtony",
  },
  {
    id: "eb",
    icon: "🎷",
    label: "E♭",
    title: "Instrument E♭ — korekta +9 półtonów",
  },
  {
    id: "manual",
    icon: "±",
    label: "Ręczna",
    title: "Ręczna — korekta −6…+6 półtonów",
    manualIcon: true,
  },
];

function GlobalSettingsFields({
  prefs,
  onPrefsChange,
}: {
  prefs: ClientDisplayPrefs;
  onPrefsChange: (prefs: ClientDisplayPrefs) => void;
}) {
  return (
    <>
      <p className={styles.fieldLab}>Wygląd</p>
      <ShellAppearanceFields />
      <p className={styles.fieldLab}>Strój instrumentu</p>
      <div
        className={styles.pitchToggle}
        role="group"
        aria-label="Strój instrumentu transponującego"
      >
        {PITCH_OPTIONS.map((opt) => {
          const on = prefs.instrumentPitch === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              className={[styles.pitchOption, on ? styles.pitchOptionOn : ""]
                .filter(Boolean)
                .join(" ")}
              title={opt.title}
              aria-label={opt.title}
              aria-pressed={on}
              onClick={() => {
                setInstrumentPitch(opt.id);
                onPrefsChange({ ...prefs, instrumentPitch: opt.id });
              }}
            >
              <span
                className={[
                  styles.pitchIcon,
                  opt.manualIcon ? styles.pitchIconManual : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden
              >
                {opt.icon}
              </span>
              <span className={styles.pitchLabel}>{opt.label}</span>
            </button>
          );
        })}
      </div>
      {prefs.instrumentPitch === "manual" ? (
        <label className={styles.field}>
          Transpozycja ({prefs.instrumentPitchManual > 0 ? "+" : ""}
          {prefs.instrumentPitchManual})
          <input
            className={styles.prefsRange}
            type="range"
            min={INSTRUMENT_PITCH_MANUAL_MIN}
            max={INSTRUMENT_PITCH_MANUAL_MAX}
            step={1}
            value={prefs.instrumentPitchManual}
            onChange={(e) => {
              const n = Number(e.target.value);
              setInstrumentPitchManual(n);
              onPrefsChange({ ...prefs, instrumentPitchManual: n });
            }}
          />
        </label>
      ) : null}
      <ShellSwitchRow
        checked={prefs.sectionNamesPolish}
        onChange={(e) => {
          const next = e.target.checked;
          setSectionNamesPolish(next);
          onPrefsChange({ ...prefs, sectionNamesPolish: next });
        }}
      >
        Polskie nazwy sekcji
      </ShellSwitchRow>
    </>
  );
}

function RoleSettingsFields({
  role,
  prefs,
  onPrefsChange,
  vocalTapOn,
  onVocalTapToggle,
  scoreZoom,
  onScoreZoomChange,
  scoreFollowPlayhead,
  onScoreFollowPlayheadChange,
  scoreOctave,
  onScoreOctaveChange,
  scoreParts,
  scoreHiddenPartIds,
  onScorePartVisible,
}: {
  role: RoleId;
  prefs: ClientDisplayPrefs;
  onPrefsChange: (prefs: ClientDisplayPrefs) => void;
  vocalTapOn: boolean;
  onVocalTapToggle: (on: boolean) => void;
  scoreZoom: number;
  onScoreZoomChange: (percent: number) => void;
  scoreFollowPlayhead: boolean;
  onScoreFollowPlayheadChange: (on: boolean) => void;
  scoreOctave: ScoreOctave;
  onScoreOctaveChange: (octave: ScoreOctave) => void;
  scoreParts: ScorePartInfo[];
  scoreHiddenPartIds: readonly string[];
  onScorePartVisible: (partId: string, visible: boolean) => void;
}) {
  const [textScale, setTextScale] = useState(() => {
    try {
      const n = Number(localStorage.getItem("stagesync-client-text-scale"));
      return Number.isFinite(n) && n >= 80 && n <= 200 ? n : 100;
    } catch {
      return 100;
    }
  });
  const [autoScroll, setAutoScroll] = useState(() => {
    try {
      return localStorage.getItem("stagesync-client-autoscroll") !== "0";
    } catch {
      return true;
    }
  });

  if (role === "karaoke") {
    return (
      <>
        <label className={styles.field}>
          Skala tekstu ({textScale}%)
          <input
            className={styles.prefsRange}
            type="range"
            min={80}
            max={200}
            value={textScale}
            onChange={(e) => {
              const n = Number(e.target.value);
              setTextScale(n);
              try {
                localStorage.setItem("stagesync-client-text-scale", String(n));
              } catch {
                /* ignore */
              }
              document.documentElement.style.setProperty(
                "--ss-client-text-scale",
                `${n / 100}`,
              );
            }}
          />
        </label>
        <ShellSwitchRow
          checked={autoScroll}
          onChange={(e) => {
            const next = e.target.checked;
            setAutoScroll(next);
            try {
              localStorage.setItem(
                "stagesync-client-autoscroll",
                next ? "1" : "0",
              );
            } catch {
              /* ignore */
            }
          }}
        >
          Auto-scroll
        </ShellSwitchRow>
        <ShellSwitchRow
          checked={vocalTapOn}
          onChange={(e) => onVocalTapToggle(e.target.checked)}
        >
          Tap wokalu
        </ShellSwitchRow>
        {vocalTapOn ? (
          <p className={styles.muted}>
            Space / Tap na pane — zapis startu linii z playhead.
          </p>
        ) : null}
      </>
    );
  }
  if (role === "grid") {
    return (
      <>
        <ShellSwitchRow
          checked={prefs.hybridPolishB}
          onChange={(e) => {
            const next = e.target.checked;
            setHybridPolishB(next);
            onPrefsChange({ ...prefs, hybridPolishB: next });
          }}
        >
          H zamiast B
        </ShellSwitchRow>
        <ShellSwitchRow
          checked={prefs.literalQuality}
          onChange={(e) => {
            const next = e.target.checked;
            setLiteralQuality(next);
            onPrefsChange({ ...prefs, literalQuality: next });
          }}
        >
          Litery zamiast symboli
        </ShellSwitchRow>
        <ShellSwitchRow
          checked={prefs.gridAnimations}
          onChange={(e) => {
            const next = e.target.checked;
            setGridAnimations(next);
            onPrefsChange({ ...prefs, gridAnimations: next });
          }}
        >
          Animacje
        </ShellSwitchRow>
      </>
    );
  }
  if (role === "score") {
    const bumpZoom = (delta: number) => {
      onScoreZoomChange(clampScoreZoom(scoreZoom + delta));
    };
    return (
      <>
        <div className={styles.scoreZoomRow}>
          <Button
            variant="ghost"
            aria-label="Pomniejsz partyturę"
            onClick={() => bumpZoom(-SCORE_ZOOM_STEP)}
            disabled={scoreZoom <= SCORE_ZOOM_MIN}
          >
            −
          </Button>
          <span className={styles.scoreZoomLabel}>{scoreZoom}%</span>
          <Button
            variant="ghost"
            aria-label="Powiększ partyturę"
            onClick={() => bumpZoom(SCORE_ZOOM_STEP)}
            disabled={scoreZoom >= SCORE_ZOOM_MAX}
          >
            +
          </Button>
          <Button
            variant="ghost"
            onClick={() => onScoreZoomChange(SCORE_ZOOM_DEFAULT)}
          >
            Reset
          </Button>
        </div>
        <label className={styles.scoreOctaveField}>
          Oktawa
          <select
            className={styles.scoreOctaveSelect}
            aria-label="Transpozycja oktawy partytury"
            value={String(scoreOctave)}
            onChange={(e) =>
              onScoreOctaveChange(clampScoreOctave(e.target.value))
            }
          >
            <option value="-1">−1</option>
            <option value="0">0</option>
            <option value="1">+1</option>
          </select>
        </label>
        <ShellSwitchRow
          checked={scoreFollowPlayhead}
          onChange={(e) => onScoreFollowPlayheadChange(e.target.checked)}
        >
          Śledź wskaźnik odtwarzania
        </ShellSwitchRow>
        {scoreParts.length > 1 ? (
          <div
            className={styles.scoreParts}
            role="group"
            aria-label="Widoczne partie"
          >
            {scoreParts.map((part) => {
              const on = !scoreHiddenPartIds.includes(part.id);
              return (
                <label key={part.id} className={styles.scorePartItem}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) =>
                      onScorePartVisible(part.id, e.target.checked)
                    }
                  />
                  <span>{part.label}</span>
                </label>
              );
            })}
          </div>
        ) : null}
      </>
    );
  }
  return (
    <ShellSwitchRow
      checked={prefs.formNotesEdit}
      onChange={(e) => {
        const next = e.target.checked;
        setFormNotesEdit(next);
        onPrefsChange({ ...prefs, formNotesEdit: next });
      }}
    >
      Edycja notatek Formy
    </ShellSwitchRow>
  );
}
