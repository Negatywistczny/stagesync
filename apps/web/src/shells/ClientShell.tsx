import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "react-router";
import { toggleAppFullscreen } from "@lib/client/desktopBridge.js";
import {
  DESKTOP_MENU_EVENT,
  parseDesktopMenuDetail,
} from "@lib/client/desktopMenuEvents.js";
import {
  releaseScreenWakeLock,
  requestScreenWakeLock,
} from "@lib/client/screenWakeLock.js";
import {
  shouldShowFullscreenControl,
  shouldShowOperatorNav,
} from "@lib/shell-operator/operatorSurface.js";
import { useMqMobileCompact } from "@lib/client/useMqMobileCompact.js";
import { OperatorNav } from "./components/OperatorNav.js";
import {
  DEVICE_DISPLAY_NAME_CHANGED_EVENT,
  getStoredDeviceDisplayName,
  setStoredDeviceDisplayName,
} from "@lib/client/deviceNamePrefs.js";
import {
  resolveMeterAt,
  resolveStageCueBanner,
  resolveTempoAt,
  ticksToBbt,
  type Project,
} from "@stagesync/shared";
import { loadClientDisplayPrefs } from "@lib/client/clientDisplayPrefs.js";
import {
  ticksFromSyncLeadAlongMap,
  ticksFromSyncLeadMs,
} from "@lib/timeline/syncLead.js";
import { useActiveProject } from "@lib/shell-operator/useActiveProject.js";
import { useTransport } from "../transport/useTransport.js";
import { noteH01ConsumerRender } from "../transport/h01PerfProbe.js";
import { ConnectionIndicator } from "./ConnectionIndicator.js";
import { ConnectionLostBanner } from "./ConnectionLostBanner.js";
import {
  loadScoreHiddenParts,
  loadScoreOctave,
  type ScoreOctave,
  type ScorePartInfo,
} from "@lib/timeline-edit/scoreOsmd.js";
import { SCORE_ZOOM_DEFAULT } from "@lib/timeline-edit/scorePlayhead.js";
import { CueToast } from "./client/CueToast.js";
import { ClientChrome } from "./client/ClientChrome.js";
import styles from "./ClientShell.module.css";
import { ClientNameModal } from "./client/ClientNameModal.js";
import { ClientStagePanes } from "./client/ClientStagePanes.js";
import { ClientWelcome } from "./client/ClientWelcome.js";
import { CLIENT_ROLES, type ClientRoleId } from "./client/clientRoles.js";


type RoleId = ClientRoleId;

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
      <ClientNameModal
        wsStatus={wsStatus}
        latencyMs={latencyMs}
        nameDraft={nameDraft}
        setNameDraft={setNameDraft}
        onSubmit={submitName}
      />
    );
  }

  if (!started) {
    return (
      <ClientWelcome
        wsStatus={wsStatus}
        isCompactMobile={isCompactMobile}
        name={name}
        picked={picked}
        onRoleTileClick={onRoleTileClick}
        onEditName={() => {
          setNameDraft(name);
          setNameModal(true);
        }}
        onStart={() => setStarted(true)}
        chrome={renderClientChrome(false)}
      />
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

      <ClientStagePanes
        picked={picked}
        activeProject={activeProject}
        displayTicks={displayTicks}
        projectLoading={projectLoading}
        activeProjectId={state.activeProjectId}
        displayPrefs={displayPrefs}
        setDisplayPrefs={setDisplayPrefs}
        liveDesk={liveDesk}
        vocalTapOn={vocalTapOn}
        setVocalTapOn={setVocalTapOn}
        vocalTapIndex={vocalTapIndex}
        setVocalTapIndex={setVocalTapIndex}
        setActiveProject={setActiveProject}
        setDrumsNoteError={setDrumsNoteError}
        roleSettings={roleSettings}
        setRoleSettings={setRoleSettings}
        toggleRoleSettings={toggleRoleSettings}
        scoreZoom={scoreZoom}
        setScoreZoom={setScoreZoom}
        scoreFollowPlayhead={scoreFollowPlayhead}
        setScoreFollowPlayhead={setScoreFollowPlayhead}
        scoreOctave={scoreOctave}
        setScoreOctave={setScoreOctave}
        scoreParts={scoreParts}
        setScoreParts={setScoreParts}
        scoreHiddenPartIds={scoreHiddenPartIds}
        setScoreHiddenPartIds={setScoreHiddenPartIds}
        seek={seek}
      />
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
