import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@stagesync/ui";
import { ticksToBbt, toDisplayBar } from "@stagesync/shared";
import { useTransport } from "../transport/useTransport.js";
import { IconSettings } from "./icons.js";
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
  const connected = wsStatus === "connected";

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
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden />
            StageSync
          </div>
          <span
            className={[styles.conn, connected ? styles.connOn : ""].join(" ")}
          >
            {connected ? "Połączony" : "Rozłączony"}
          </span>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Ustawienia globalne"
            onClick={() => setGlobalSettings(true)}
          >
            <IconSettings />
          </button>
        </header>
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
        {globalSettings ? (
          <SettingsDrawer
            title="Globalne"
            onClose={() => setGlobalSettings(false)}
          >
            <GlobalSettingsFields />
          </SettingsDrawer>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerPrimary}>
          <button
            type="button"
            className={styles.brandBtn}
            onClick={() => setStarted(false)}
            title="Powrót do wyboru ról"
          >
            <span className={styles.brandMark} aria-hidden />
            StageSync
          </button>
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
          <span
            className={[styles.conn, connected ? styles.connOn : ""].join(" ")}
          >
            {connected ? "Połączony" : "Rozłączony"}
          </span>
        </div>
        <div className={styles.headerSecondary}>
          <strong className={styles.songTitle}>Brak utworu</strong>
          <span className={styles.setlistNext} hidden>
            → następny
          </span>
          <span className={styles.takt}>
            takt {toDisplayBar(bbt.bar)}.{bbt.beat}
          </span>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Ustawienia globalne"
            onClick={() => setGlobalSettings(true)}
          >
            <IconSettings />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Pełny ekran"
            disabled
          >
            ⛶
          </button>
        </div>
      </header>

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
              <div className={styles.rolePaneHead}>
                <h2>{role.label}</h2>
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label={`Ustawienia ${role.label}`}
                  onClick={() => setRoleSettings(id)}
                >
                  <IconSettings />
                </button>
              </div>
              <p className={styles.empty}>Oczekiwanie na utwór…</p>
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

      {globalSettings ? (
        <SettingsDrawer
          title="Globalne"
          onClose={() => setGlobalSettings(false)}
        >
          <GlobalSettingsFields />
        </SettingsDrawer>
      ) : null}

      {roleSettings ? (
        <SettingsDrawer
          title={ROLES.find((r) => r.id === roleSettings)?.label ?? ""}
          onClose={() => setRoleSettings(null)}
        >
          <RoleSettingsFields role={roleSettings} />
        </SettingsDrawer>
      ) : null}

      <p className={styles.transportNote}>
        {state.playing ? "Play" : "Pause"} · {state.bpm} BPM · WS {wsStatus}
      </p>
    </div>
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
      <label className={styles.switchRow}>
        <input type="checkbox" disabled /> Polskie nazwy sekcji
      </label>
      <label className={styles.switchRow}>
        <input type="checkbox" disabled /> Tryb jasny
      </label>
      <label className={styles.switchRow}>
        <input type="checkbox" disabled /> Wysoki kontrast
      </label>
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
        <label className={styles.switchRow}>
          <input type="checkbox" defaultChecked disabled /> Auto-scroll
        </label>
        <Button variant="secondary" disabled>
          Tap wokalu
        </Button>
      </>
    );
  }
  if (role === "grid") {
    return (
      <>
        <label className={styles.switchRow}>
          <input type="checkbox" disabled /> H zamiast B
        </label>
        <label className={styles.switchRow}>
          <input type="checkbox" disabled /> Litery zamiast symboli
        </label>
        <label className={styles.switchRow}>
          <input type="checkbox" defaultChecked disabled /> Animacje
        </label>
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
  return (
    <label className={styles.switchRow}>
      <input type="checkbox" disabled /> Edycja notatek Formy
    </label>
  );
}

function SettingsDrawer({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className={styles.drawerWrap} role="dialog" aria-modal>
      <button
        type="button"
        className={styles.drawerBackdrop}
        aria-label="Zamknij"
        onClick={onClose}
      />
      <div className={styles.drawer}>
        <div className={styles.drawerHead}>
          <h2>{title}</h2>
          <button type="button" className={styles.iconBtn} onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
