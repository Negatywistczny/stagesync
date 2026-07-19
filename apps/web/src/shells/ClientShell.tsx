import { useState } from "react";
import { Button } from "@stagesync/ui";
import { ticksToBbt, toDisplayBar } from "@stagesync/shared";
import { useTransport } from "../transport/useTransport.js";
import { ShellNav } from "./ShellNav.js";
import styles from "./ClientShell.module.css";

type RoleId = "lyrics" | "chords" | "form" | "score";

const ROLES: { id: RoleId; label: string; blurb: string }[] = [
  { id: "lyrics", label: "Tekst", blurb: "Karaoke / linie tekstu" },
  { id: "chords", label: "Akordy", blurb: "Siatka i frazy" },
  { id: "form", label: "Forma", blurb: "Sekcje / cue perkusji" },
  { id: "score", label: "Partytura", blurb: "MusicXML / OSMD" },
];

export function ClientShell() {
  const [name, setName] = useState("Tablet");
  const [picked, setPicked] = useState<RoleId[]>([]);
  const [started, setStarted] = useState(false);
  const {
    state,
    displayTicks,
    wsStatus,
    commandPending,
    error,
    play,
    pause,
  } = useTransport();

  const bbt = ticksToBbt(displayTicks, state.timeSignature, state.ppq);
  const connected = wsStatus === "connected";

  function toggleRole(id: RoleId) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((r) => r !== id);
      if (prev.length >= 2) return [prev[1]!, id];
      return [...prev, id];
    });
  }

  function start() {
    if (picked.length === 0) return;
    setStarted(true);
  }

  if (!started) {
    return (
      <div className={styles.page}>
        <header className={styles.welcomeBar}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true" />
            StageSync
          </div>
          <ShellNav />
        </header>
        <main className={styles.welcome}>
          <p className={styles.eyebrow}>Klient</p>
          <h1 className={styles.welcomeTitle}>Wybierz rolę</h1>
          <label className={styles.nameField}>
            Nazwa tabletu
            <input
              className={styles.nameInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className={styles.roleGrid}>
            {ROLES.map((role) => {
              const on = picked.includes(role.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  className={[styles.roleCard, on ? styles.roleOn : ""]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={on}
                  onClick={() => toggleRole(role.id)}
                >
                  <strong>{role.label}</strong>
                  <span>{role.blurb}</span>
                </button>
              );
            })}
          </div>
          <p className={styles.hint}>Wybierz 1 lub 2 role (widok dzielony).</p>
          <Button
            variant="primary"
            disabled={picked.length === 0}
            onClick={start}
          >
            {picked.length === 2 ? "Rozpocznij widok dzielony" : "Rozpocznij"}
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.hud}>
        <button
          type="button"
          className={styles.brandBtn}
          onClick={() => setStarted(false)}
          title="Powrót do wyboru ról"
        >
          <span className={styles.brandMark} aria-hidden="true" />
          StageSync
        </button>
        <ShellNav />
        <div className={styles.context}>
          <strong>{name}</strong>
          <span>{picked.map((id) => ROLES.find((r) => r.id === id)?.label).join(" + ")}</span>
        </div>
        <span className={styles.meter}>
          takt {toDisplayBar(bbt.bar)}.{bbt.beat}
        </span>
        <span
          className={[styles.connDot, connected ? styles.connOn : ""].join(" ")}
          title={`WS: ${wsStatus}`}
          aria-label={`WebSocket ${wsStatus}`}
        />
        <div className={styles.actions}>
          <Button
            variant="primary"
            loading={commandPending}
            selected={state.playing}
            onClick={() => void play()}
          >
            Play
          </Button>
          <Button
            variant="secondary"
            loading={commandPending}
            selected={!state.playing}
            onClick={() => void pause()}
          >
            Pause
          </Button>
          <Button variant="ghost" disabled title="Wkrótce">
            Ustawienia
          </Button>
        </div>
      </header>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <main
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
            <section key={id} className={styles.card} aria-label={role.label}>
              <h2 className={styles.cardTitle}>{role.label}</h2>
              <p className={styles.lede}>
                Placeholder widoku „{role.label}” — parity v4, sync z transportem
                SSOT w kolejnych PR.
              </p>
              <p className={styles.cueSlot}>Cue live — slot (jak w v4).</p>
            </section>
          );
        })}
      </main>
    </div>
  );
}
