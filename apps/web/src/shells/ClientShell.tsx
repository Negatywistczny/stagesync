import { useState } from "react";
import { Button } from "@stagesync/ui";
import { ticksToBbt, toDisplayBar } from "@stagesync/shared";
import { useTransport } from "../transport/useTransport.js";
import { ShellNav } from "./ShellNav.js";
import styles from "./ClientShell.module.css";

type RoleTab = "chords" | "lyrics" | "drums";

const TABS: { id: RoleTab; label: string }[] = [
  { id: "chords", label: "Chords" },
  { id: "lyrics", label: "Lyrics" },
  { id: "drums", label: "Drums" },
];

export function ClientShell() {
  const [tab, setTab] = useState<RoleTab>("chords");
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

  return (
    <div className={styles.shell}>
      <header className={styles.hud}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          StageSync
        </div>
        <ShellNav />
        <div className={styles.context}>
          <strong>Client</strong>
          <span>HUD transportu</span>
        </div>
        <span className={styles.meter} title="Pozycja BBT">
          takt {toDisplayBar(bbt.bar)}.{bbt.beat}
        </span>
        <span
          className={[styles.connDot, connected ? styles.connOn : ""].join(" ")}
          title={`WS: ${wsStatus}`}
          aria-label={`WebSocket ${wsStatus}`}
        />
        <div className={styles.segmented} role="tablist" aria-label="Rola">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={[
                styles.segBtn,
                tab === item.id ? styles.segActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
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
        </div>
      </header>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <main className={styles.stage}>
        {tab === "chords" ? (
          <section className={styles.card} aria-label="Widok Chords">
            <h2>Chords</h2>
            <p className={styles.lede}>
              Placeholder siatki akordów — layout Booth, bez synchronizacji.
            </p>
            <div className={styles.chordGrid}>
              {["Am", "F", "C", "G", "Dm", "Em", "Am7", "G/B"].map((c, i) => (
                <div
                  key={c}
                  className={[styles.chordCell, i === 0 ? styles.now : ""].join(
                    " ",
                  )}
                >
                  {c}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "lyrics" ? (
          <section className={styles.card} aria-label="Widok Lyrics">
            <h2>Lyrics</h2>
            <p className={styles.lede}>
              Placeholder linii tekstu — highlight wizualny.
            </p>
            <div className={styles.lyrics}>
              <div>Waiting on the platform light</div>
              <div className={styles.nowLine}>
                Midnight express, we ride tonight
              </div>
              <div>Steel and signal, pulse and wire</div>
              <div>Hold the downbeat, lift the choir</div>
            </div>
          </section>
        ) : null}

        {tab === "drums" ? (
          <section className={styles.card} aria-label="Widok Drums">
            <h2>Drums</h2>
            <p className={styles.lede}>Placeholder cue / metrum — bez MIDI.</p>
            <div className={styles.chordGrid}>
              {["1", "+", "2", "+", "3", "+", "4", "+"].map((c, i) => (
                <div
                  key={`${c}-${i}`}
                  className={[styles.chordCell, i === 0 ? styles.now : ""].join(
                    " ",
                  )}
                >
                  {c}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
