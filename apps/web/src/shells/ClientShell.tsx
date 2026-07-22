import { useEffect, useRef, useState, type FormEvent } from "react";
import { toggleAppFullscreen } from "../lib/desktopBridge.js";
import { Button } from "@stagesync/ui";
import { toDisplayBar, ticksToBbt, type Project } from "@stagesync/shared";
import {
  loadClientDisplayPrefs,
  setFormNotesEdit,
  setGridAnimations,
  setHybridPolishB,
  setLiteralQuality,
  type ClientDisplayPrefs,
} from "../lib/clientDisplayPrefs.js";
import { applyVocalTap, vocalTapQueue } from "../lib/clientVocalTap.js";
import { putProject } from "../lib/libraryApi.js";
import { fetchSetlist } from "../lib/setlistApi.js";
import { useActiveProject } from "../lib/useActiveProject.js";
import { useTransport } from "../transport/useTransport.js";
import type { WsStatus } from "../transport/transportContext.js";
import { ConnectionIndicator } from "./ConnectionIndicator.js";
import { DrumsPane } from "./client/DrumsPane.js";
import { GridPane } from "./client/GridPane.js";
import { KaraokePane } from "./client/KaraokePane.js";
import { ScorePane } from "./client/ScorePane.js";
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
    displayTicks,
    wsStatus,
    latencyMs,
    stageCue,
    play,
    commandPending,
    error: transportError,
    announcePresence,
  } = useTransport();
  const headerBbt = ticksToBbt(displayTicks, state.timeSignature, state.ppq);
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
  const [cueVisible, setCueVisible] = useState(false);
  const [cueText, setCueText] = useState("");
  const [setlistIds, setSetlistIds] = useState<string[]>([]);
  const [setlistEnabled, setSetlistEnabled] = useState(false);

  useEffect(() => {
    if (!started) return;
    announcePresence({
      displayName: name.trim() || null,
      roles: picked,
    });
  }, [started, name, picked, announcePresence]);

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
    if (!stageCue) return;
    // Role filter: if roles listed, only show when client has that role picked
    if (stageCue.roles && stageCue.roles.length > 0) {
      const match = stageCue.roles.some((r) => picked.includes(r as RoleId));
      if (!match) {
        setCueVisible(false);
        return;
      }
    }
    setCueText(stageCue.text);
    setCueVisible(true);
    const ttl = stageCue.ttlMs;
    // 0 = infinite (Admin ∞); missing/non-finite → same default as server (6s).
    if (ttl === 0) return;
    const delayMs =
      typeof ttl === "number" && Number.isFinite(ttl) && ttl > 0 ? ttl : 6000;
    const t = window.setTimeout(() => setCueVisible(false), delayMs);
    return () => window.clearTimeout(t);
  }, [stageCue, picked]);

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
    nextSetlistId,
    nextSongPending: commandPending,
    transportError,
    onNextSong: () => void onNextSong(),
    onFullscreen: () => void onFullscreen(),
    globalSettingsOpen: globalSettings,
    onToggleGlobalSettings: toggleGlobalSettings,
    onCloseGlobalSettings: () => setGlobalSettings(false),
    onBack: started ? () => setStarted(false) : undefined,
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
        <ClientHeader {...headerProps} started={false} />
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
      <ClientHeader {...headerProps} started />
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
                    />
                  </SettingsPopover>
                ) : null}
              </SettingsPopoverAnchor>
              {id === "drums" ? (
                activeProject ? (
                  <DrumsPane
                    project={activeProject}
                    displayTicks={displayTicks}
                    notesEdit={displayPrefs.formNotesEdit}
                    onNoteChange={(clipId, note) => {
                      if (!state.activeProjectId) return;
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
                  vocalTapOn={vocalTapOn}
                  vocalTapIndex={vocalTapIndex}
                  onVocalTap={() => {
                    if (!activeProject || !state.activeProjectId) return;
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
                />
              ) : id === "grid" ? (
                <GridPane
                  project={activeProject}
                  displayTicks={displayTicks}
                  loading={projectLoading}
                  hasActiveProjectId={Boolean(state.activeProjectId)}
                  prefs={displayPrefs}
                />
              ) : id === "score" ? (
                <ScorePane
                  project={activeProject}
                  loading={projectLoading}
                  hasActiveProjectId={Boolean(state.activeProjectId)}
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

      <div className={styles.cueHost} aria-live="polite">
        <div className={styles.cueToast} hidden={!cueVisible}>
          {cueText || "TERAZ — cue"}
        </div>
      </div>
    </div>
  );
}

type ClientHeaderProps = {
  wsStatus: WsStatus;
  latencyMs: number | null;
  started: boolean;
  songTitle: string;
  bbt: { bar: number; beat: number };
  nextSetlistId: string | null;
  nextSongPending: boolean;
  transportError: string | null;
  onNextSong: () => void;
  onFullscreen: () => void;
  globalSettingsOpen: boolean;
  onToggleGlobalSettings: () => void;
  onCloseGlobalSettings: () => void;
  onBack?: () => void;
};

function ClientHeader({
  wsStatus,
  latencyMs,
  started,
  songTitle,
  bbt,
  nextSetlistId,
  nextSongPending,
  transportError,
  onNextSong,
  onFullscreen,
  globalSettingsOpen,
  onToggleGlobalSettings,
  onCloseGlobalSettings,
  onBack,
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
      <span className={styles.takt}>
        takt {toDisplayBar(bbt.bar)}.{bbt.beat}
      </span>

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
              <GlobalSettingsFields />
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

function GlobalSettingsFields() {
  return (
    <>
      <p className={styles.fieldLab}>Wygląd</p>
      <ShellAppearanceFields />
      <p className={styles.muted}>
        Tonacja koncertowa / polskie nazwy — później (β).
      </p>
    </>
  );
}

function RoleSettingsFields({
  role,
  prefs,
  onPrefsChange,
  vocalTapOn,
  onVocalTapToggle,
}: {
  role: RoleId;
  prefs: ClientDisplayPrefs;
  onPrefsChange: (prefs: ClientDisplayPrefs) => void;
  vocalTapOn: boolean;
  onVocalTapToggle: (on: boolean) => void;
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
  const [scoreZoom, setScoreZoom] = useState(100);

  if (role === "karaoke") {
    return (
      <>
        <label className={styles.field}>
          Skala tekstu ({textScale}%)
          <input
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
    return (
      <>
        <div className={styles.row}>
          <Button
            variant="ghost"
            onClick={() => setScoreZoom((z) => Math.max(50, z - 10))}
          >
            −
          </Button>
          <span>{scoreZoom}%</span>
          <Button
            variant="ghost"
            onClick={() => setScoreZoom((z) => Math.min(200, z + 10))}
          >
            +
          </Button>
          <Button variant="ghost" onClick={() => setScoreZoom(100)}>
            Fit
          </Button>
        </div>
        <p className={styles.muted}>
          Zoom lokalny (stub OSMD). Partie / oktawa — później.
        </p>
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
