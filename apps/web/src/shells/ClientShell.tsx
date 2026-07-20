import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@stagesync/ui";
import {
  resolveFormaClipAt,
  ticksToBbt,
  toDisplayBar,
  type Project,
} from "@stagesync/shared";
import { APP_VERSION } from "../lib/appVersion.js";
import { fetchProject } from "../lib/libraryApi.js";
import { useTransport } from "../transport/useTransport.js";
import type { WsStatus } from "../transport/transportContext.js";
import { ConnectionIndicator } from "./ConnectionIndicator.js";
import { IconSettings } from "./icons.js";
import {
  SettingsPopover,
  SettingsPopoverAnchor,
} from "./SettingsPopover.js";
import { ShellIconButton } from "./ShellIconButton.js";
import { ShellSwitchRow } from "./ShellSwitchRow.js";
import { ShellWordmark } from "./ShellWordmark.js";
import styles from "./ClientShell.module.css";

type RoleId = "karaoke" | "grid" | "score" | "drums";

const ROLES: { id: RoleId; label: string; blurb: string }[] = [
  { id: "karaoke", label: "Tekst", blurb: "Karaoke z liniami i beatami" },
  { id: "grid", label: "Akordy", blurb: "Siatka zsynchronizowana z utworem" },
  { id: "score", label: "Partytura", blurb: "MusicXML / podświetlenie taktu" },
  { id: "drums", label: "Forma", blurb: "Sekcje i takty bez tekstu" },
];

export function ClientShell() {
  const [nameModal, setNameModal] = useState(true);
  const [name, setName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [picked, setPicked] = useState<RoleId[]>([]);
  const [started, setStarted] = useState(false);
  const [globalSettings, setGlobalSettings] = useState(false);
  const [roleSettings, setRoleSettings] = useState<RoleId | null>(null);
  const { state, displayTicks, wsStatus } = useTransport();
  const bbt = ticksToBbt(displayTicks, state.timeSignature, state.ppq);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  useEffect(() => {
    const id = state.activeProjectId;
    if (!id) {
      setActiveProject(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const project = await fetchProject(id);
        if (!cancelled) setActiveProject(project);
      } catch {
        if (!cancelled) setActiveProject(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.activeProjectId]);

  const activeSection = activeProject
    ? resolveFormaClipAt(activeProject, displayTicks)
    : null;
  const songTitle = activeProject?.name ?? "Brak utworu";

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
    started,
    songTitle,
    bbt,
    globalSettingsOpen: globalSettings,
    onToggleGlobalSettings: toggleGlobalSettings,
    onCloseGlobalSettings: () => setGlobalSettings(false),
    onBack: started ? () => setStarted(false) : undefined,
  };

  if (nameModal) {
    return (
      <div className={styles.page}>
        <div className={styles.modal} role="dialog" aria-modal aria-labelledby="name-title">
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
        <main className={styles.welcome}>
          <p className={styles.greeting}>
            Cześć, {name}{" "}
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => {
                setNameDraft(name);
                setNameModal(true);
              }}
            >
              Zmień nazwę
            </button>
          </p>
          <h1 className={styles.welcomeTitle}>Wybierz rolę</h1>
          <p className={styles.muted}>Możesz wybrać jedną lub dwie role.</p>
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
                  <strong>{r.label}</strong>
                  <span>{r.blurb}</span>
                </button>
              );
            })}
          </div>
          <Button
            variant="primary"
            disabled={picked.length === 0}
            onClick={() => setStarted(true)}
          >
            {picked.length === 2
              ? "Rozpocznij widok dzielony"
              : "Rozpocznij"}
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <ClientHeader {...headerProps} started />

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
          const isDrums = id === "drums";
          return (
            <section key={id} className={styles.rolePane} aria-label={role.label}>
              <div className={styles.rolePaneHead}>
                <h2>{role.label}</h2>
                <SettingsPopoverAnchor>
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
                      <RoleSettingsFields role={id} />
                    </SettingsPopover>
                  ) : null}
                </SettingsPopoverAnchor>
              </div>
              {isDrums && activeProject ? (
                <div className={styles.formaPane}>
                  <p className={styles.formaTitle}>{activeProject.name}</p>
                  <p className={styles.formaSection}>
                    {activeSection?.name ?? "—"}
                  </p>
                  <p className={styles.muted}>
                    takt {toDisplayBar(bbt.bar)}.{bbt.beat}
                  </p>
                </div>
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
        <div className={styles.cueToast} hidden>
          TERAZ — cue
        </div>
      </div>

      <p className={styles.transportNote}>
        {state.playing ? "Play" : "Pause"} · {state.bpm} BPM · WS {wsStatus}
      </p>
    </div>
  );
}

type ClientHeaderProps = {
  wsStatus: WsStatus;
  started: boolean;
  songTitle: string;
  bbt: { bar: number; beat: number };
  globalSettingsOpen: boolean;
  onToggleGlobalSettings: () => void;
  onCloseGlobalSettings: () => void;
  onBack?: () => void;
};

function ClientHeader({
  wsStatus,
  started,
  songTitle,
  bbt,
  globalSettingsOpen,
  onToggleGlobalSettings,
  onCloseGlobalSettings,
  onBack,
}: ClientHeaderProps) {
  return (
    <header className={styles.header}>
      <ShellWordmark
        version={APP_VERSION}
        onClick={started && onBack ? onBack : undefined}
        title={started && onBack ? "Powrót do wyboru ról" : undefined}
      />

      <div className={styles.metronome} aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={[
              styles.dot,
              i === bbt.beat ? styles.dotActive : "",
            ].join(" ")}
          />
        ))}
      </div>

      <strong className={styles.songTitle}>{songTitle}</strong>
      <span className={styles.takt}>
        takt {toDisplayBar(bbt.bar)}.{bbt.beat}
      </span>

      <div className={styles.headerActions}>
        <ConnectionIndicator status={wsStatus} />
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
        <ShellIconButton label="Pełny ekran" disabled>
          ⛶
        </ShellIconButton>
      </div>
    </header>
  );
}

function GlobalSettingsFields() {
  return (
    <>
      <p className={styles.fieldLab}>Tonacja / strój</p>
      <div className={styles.chips}>
        {["C", "B♭", "E♭", "Ręczna"].map((x) => (
          <button key={x} type="button" className={styles.chip} disabled>
            {x}
          </button>
        ))}
      </div>
      <ShellSwitchRow disabled>Polskie nazwy sekcji</ShellSwitchRow>
      <ShellSwitchRow disabled>Tryb jasny</ShellSwitchRow>
      <ShellSwitchRow disabled>Wysoki kontrast</ShellSwitchRow>
    </>
  );
}

function RoleSettingsFields({ role }: { role: RoleId }) {
  if (role === "karaoke") {
    return (
      <>
        <label className={styles.field}>
          Skala tekstu
          <input type="range" min={80} max={200} defaultValue={100} disabled />
        </label>
        <ShellSwitchRow defaultChecked disabled>
          Auto-scroll
        </ShellSwitchRow>
        <Button variant="secondary" disabled>
          Tap wokalu
        </Button>
      </>
    );
  }
  if (role === "grid") {
    return (
      <>
        <ShellSwitchRow disabled>H zamiast B</ShellSwitchRow>
        <ShellSwitchRow disabled>Litery zamiast symboli</ShellSwitchRow>
        <ShellSwitchRow defaultChecked disabled>
          Animacje
        </ShellSwitchRow>
      </>
    );
  }
  if (role === "score") {
    return (
      <>
        <div className={styles.row}>
          <Button variant="ghost" disabled>
            −
          </Button>
          <span>100%</span>
          <Button variant="ghost" disabled>
            +
          </Button>
          <Button variant="ghost" disabled>
            Fit
          </Button>
        </div>
        <p className={styles.muted}>Partie / oktawa — shell.</p>
      </>
    );
  }
  return <ShellSwitchRow disabled>Edycja notatek Formy</ShellSwitchRow>;
}
