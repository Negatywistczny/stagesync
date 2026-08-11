import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router";
import { toggleAppFullscreen } from "@lib/client/desktopBridge.js";
import {
  DESKTOP_MENU_EVENT,
  parseDesktopMenuDetail,
} from "@lib/client/desktopMenuEvents.js";
import {
  releaseScreenWakeLock,
  requestScreenWakeLock,
} from "@lib/client/screenWakeLock.js";
import { Button, Input } from "@stagesync/ui";
import { getOperatorAppJumpLinks } from "@lib/shell-operator/operatorNavRoutes.js";
import { markOperatorSession } from "@lib/shell-operator/operatorSession.js";
import {
  shouldShowFullscreenControl,
  shouldShowOperatorNav,
} from "@lib/shell-operator/operatorSurface.js";
import { useMqMobileCompact } from "@lib/client/useMqMobileCompact.js";
import { ChangeServerControl } from "./ChangeServerControl.js";
import { OperatorPinFields } from "./OperatorPinFields.js";
import { OperatorNav } from "./components/OperatorNav.js";
import {
  DEVICE_DISPLAY_NAME_CHANGED_EVENT,
  DEVICE_DISPLAY_NAME_MAX,
  getStoredDeviceDisplayName,
  setStoredDeviceDisplayName,
} from "@lib/client/deviceNamePrefs.js";
import {
  INSTRUMENT_PITCH_MANUAL_MAX,
  INSTRUMENT_PITCH_MANUAL_MIN,
  resolveMeterAt,
  resolveStageCueBanner,
  resolveTempoAt,
  stageCueBannerLabel,
  ticksToBbt,
  type Project,
} from "@stagesync/shared";
import { loadClientDisplayPrefs } from "@lib/client/clientDisplayPrefs.js";
import { applyVocalTap, vocalTapQueue } from "@lib/client/clientVocalTap.js";
import { putProject } from "@lib/shell-operator/libraryApi.js";
import {
  ticksFromSyncLeadAlongMap,
  ticksFromSyncLeadMs,
} from "@lib/timeline/syncLead.js";
import { useActiveProject } from "@lib/shell-operator/useActiveProject.js";
import { useTransport } from "../transport/useTransport.js";
import { noteH01ConsumerRender } from "../transport/h01PerfProbe.js";
import { ConnectionIndicator } from "./ConnectionIndicator.js";
import { ConnectionLostBanner } from "./ConnectionLostBanner.js";
import { DrumsPane } from "./client/DrumsPane.js";
import { GridPane } from "./client/GridPane.js";
import { KaraokePane } from "./client/KaraokePane.js";
import { ScorePane } from "./client/ScorePane.js";
import {
  loadScoreHiddenParts,
  loadScoreOctave,
  saveScoreHiddenParts,
  saveScoreOctave,
  type ScoreOctave,
  type ScorePartInfo,
} from "@lib/timeline-edit/scoreOsmd.js";
import { SCORE_ZOOM_DEFAULT } from "@lib/timeline-edit/scorePlayhead.js";
import { IconMixer, IconPencil } from "./icons.js";
import { SettingsPopover, SettingsPopoverAnchor } from "./SettingsPopover.js";
import { ShellIconButton } from "./ShellIconButton.js";
import { ShellWordmark } from "./ShellWordmark.js";
import { CueToast } from "./client/CueToast.js";
import { ClientChrome } from "./client/ClientChrome.js";
import { RoleSettingsFields } from "./client/ClientSettingsFields.js";
import styles from "./ClientShell.module.css";

type RoleId = "karaoke" | "grid" | "score" | "drums";

const ROLES: { id: RoleId; label: string; icon: string }[] = [
  { id: "karaoke", label: "Tekst", icon: "🎤" },
  { id: "grid", label: "Akordy", icon: "🎹" },
  { id: "score", label: "Partytura", icon: "🎼" },
  { id: "drums", label: "Forma", icon: "🥁" },
];

export function ClientShell() {
  const { pathname } = useLocation();
  const showOperatorNav = shouldShowOperatorNav(pathname);
  const isCompactMobile = useMqMobileCompact();
  const operatorNavCompact = isCompactMobile && showOperatorNav;
  const [nameModal, setNameModal] = useState(false);
  const [name, setName] = useState(() => getStoredDeviceDisplayName() ?? "");
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
    seek,
    error: transportError,
    announcePresence,
    setSoftClockTempoMaps,
  } = useTransport();
  // H-01 probe: counts ClientShell commits while soft-clock advances (?ss_perf=h01).
  noteH01ConsumerRender();
  const {
    activeProject,
    setActiveProject,
    loading: projectLoading,
    reload: reloadActiveProject,
  } = useActiveProject(state.activeProjectId);

  useEffect(() => {
    if (!activeProject) {
      setSoftClockTempoMaps(null);
      return;
    }
    setSoftClockTempoMaps({
      defaultBpm: activeProject.defaultBpm,
      defaultMeter: activeProject.defaultMeter,
      tempoMap: activeProject.tempoMap,
      meterMap: activeProject.meterMap,
      ppq: activeProject.ppq,
    });
    return () => setSoftClockTempoMaps(null);
  }, [activeProject, setSoftClockTempoMaps]);

  const displayTicks =
    rawDisplayTicks +
    (activeProject
      ? ticksFromSyncLeadAlongMap(
          liveDesk.syncLeadMs,
          rawDisplayTicks,
          activeProject,
        )
      : ticksFromSyncLeadMs(liveDesk.syncLeadMs, state.bpm, state.ppq));

  const headerBbt = ticksToBbt(displayTicks, state.timeSignature, state.ppq);
  const prevWsStatusRef = useRef(wsStatus);
  const [displayPrefs, setDisplayPrefs] = useState(loadClientDisplayPrefs);
  const [vocalTapOn, setVocalTapOn] = useState(false);
  const [vocalTapIndex, setVocalTapIndex] = useState(0);
  const [drumsNoteError, setDrumsNoteError] = useState<string | null>(null);
  const [wallClockMs, setWallClockMs] = useState(() => Date.now());
  const cueAlertSeenRef = useRef<Set<string>>(new Set());
  const [cueFlashId, setCueFlashId] = useState<string | null>(null);
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
    function onMenu(ev: Event) {
      const detail = parseDesktopMenuDetail(ev);
      if (detail?.action !== "appearance") return;
      setRoleSettings(null);
      setGlobalSettings(true);
    }
    window.addEventListener(DESKTOP_MENU_EVENT, onMenu);
    return () => window.removeEventListener(DESKTOP_MENU_EVENT, onMenu);
  }, []);

  useEffect(() => {
    const onName = () => setName(getStoredDeviceDisplayName() ?? "");
    window.addEventListener(DEVICE_DISPLAY_NAME_CHANGED_EVENT, onName);
    return () => {
      window.removeEventListener(DEVICE_DISPLAY_NAME_CHANGED_EVENT, onName);
    };
  }, []);

  useEffect(() => {
    const displayName = name.trim() || null;
    if (!displayName) return;
    announcePresence({
      displayName,
      roles: started ? picked : [],
    });
  }, [started, name, picked, announcePresence]);

  // Dual wake-lock (PWA): keep screen on while a role view is active.
  useEffect(() => {
    if (!started) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    void (async () => {
      sentinel = await requestScreenWakeLock();
      if (cancelled && sentinel) {
        await releaseScreenWakeLock(sentinel);
        sentinel = null;
      }
    })();
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void requestScreenWakeLock().then((s) => {
          sentinel = s;
        });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      void releaseScreenWakeLock(sentinel);
    };
  }, [started]);

  // After WS reconnect, refetch project even if activeProjectId unchanged (#358).
  useEffect(() => {
    const prev = prevWsStatusRef.current;
    prevWsStatusRef.current = wsStatus;
    if (prev === "disconnected" && wsStatus === "connected") {
      void reloadActiveProject();
    }
  }, [wsStatus, reloadActiveProject]);

  useEffect(() => {
    const id = window.setInterval(() => setWallClockMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const sessionCues = stageCues.filter((cue) => {
    if (cue.ttlMs === 0) return true;
    const ttl =
      typeof cue.ttlMs === "number" &&
      Number.isFinite(cue.ttlMs) &&
      cue.ttlMs > 0
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

  async function onFullscreen() {
    await toggleAppFullscreen();
  }

  function toggleRole(id: RoleId) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((r) => r !== id);
      if (prev.length >= 2) return [prev[1]!, id];
      return [...prev, id];
    });
  }

  function onRoleTileClick(id: RoleId) {
    if (isCompactMobile) {
      setPicked([id]);
      setStarted(true);
      return;
    }
    toggleRole(id);
  }

  function submitName(e: FormEvent) {
    e.preventDefault();
    try {
      const n = setStoredDeviceDisplayName(nameDraft);
      setName(n);
      setNameModal(false);
    } catch {
      /* keep modal open */
    }
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
    transportError,
    compact: isCompactMobile,
    showAppJump: showOperatorNav && !isCompactMobile,
    hideGlobalSettings: operatorNavCompact,
    onFullscreen: shouldShowFullscreenControl()
      ? () => void onFullscreen()
      : undefined,
    globalSettingsOpen: globalSettings,
    onToggleGlobalSettings: toggleGlobalSettings,
    onCloseGlobalSettings: () => setGlobalSettings(false),
    onBack: started ? () => setStarted(false) : undefined,
    displayPrefs,
    onDisplayPrefsChange: setDisplayPrefs,
  };

  const renderClientChrome = (startedFlag: boolean) => {
    const chrome = <ClientChrome {...headerProps} started={startedFlag} />;
    if (!operatorNavCompact) return chrome;
    return (
      <div className={styles.topChrome}>
        <OperatorNav
          activeApp="client"
          onSettings={toggleGlobalSettings}
          settingsLabel="Ustawienia globalne"
        />
        {chrome}
      </div>
    );
  };

  if (nameModal) {
    return (
      <div className={styles.page}>
        <div
          className={styles.modal}
          role="dialog"
          aria-modal
          aria-labelledby="name-title"
        >
          <div className={styles.modalConn}>
            <ConnectionIndicator status={wsStatus} latencyMs={latencyMs} />
          </div>
          <ConnectionLostBanner status={wsStatus} />
          <h1 id="name-title" className={styles.modalTitle}>
            Zmień nazwę
          </h1>
          <p className={styles.modalHint}>
            Podaj swoje imię lub nazwę urządzenia.
          </p>
          <form className={styles.modalForm} onSubmit={submitName}>
            <Input
              maxLength={DEVICE_DISPLAY_NAME_MAX}
              placeholder="np. Ania · saksofon"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              autoFocus
              aria-label="Imię lub nazwa urządzenia"
            />
            <Button variant="primary" type="submit">
              Zapisz
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className={styles.page}>
        {renderClientChrome(false)}
        <ConnectionLostBanner status={wsStatus} />
        <main
          className={[
            styles.welcome,
            isCompactMobile ? styles.welcomeMobile : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className={styles.welcomeHero}>
            <ShellWordmark className={styles.welcomeBrand} />
            <div className={styles.greetingRow}>
              <p className={styles.greeting}>Cześć, {name}</p>
              <ShellIconButton
                label="Zmień nazwę"
                onClick={() => {
                  setNameDraft(name);
                  setNameModal(true);
                }}
              >
                <IconPencil />
              </ShellIconButton>
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
                  aria-pressed={isCompactMobile ? undefined : on}
                  onClick={() => onRoleTileClick(r.id)}
                >
                  <span className={styles.roleIcon} aria-hidden>
                    {r.icon}
                  </span>
                  <strong className={styles.roleLabel}>{r.label}</strong>
                </button>
              );
            })}
          </div>

          {!isCompactMobile ? (
            <div className={styles.startBar}>
              <Button
                variant="primary"
                className={styles.startBarBtn}
                disabled={picked.length === 0}
                onClick={() => setStarted(true)}
              >
                {picked.length === 2
                  ? "Rozpocznij widok dzielony"
                  : "Rozpocznij"}
              </Button>
            </div>
          ) : null}
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {renderClientChrome(true)}
      <ConnectionLostBanner status={wsStatus} />

      {drumsNoteError ? (
        <p className={styles.liveSaveError} role="alert">
          {drumsNoteError}
        </p>
      ) : null}

      <div
        className={[styles.stage, picked.length === 2 ? styles.stageSplit : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {picked.map((id) => {
          const role = ROLES.find((r) => r.id === id)!;
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
                  vocalTapOn={vocalTapOn && liveDesk.clientEditEnabled}
                  vocalTapIndex={vocalTapIndex}
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
