import { useState } from "react";
import { Button } from "@stagesync/ui";
import { ticksToBbt, toDisplayBar } from "@stagesync/shared";
import { useTransport } from "./transport/useTransport.js";
import "./App.css";

export default function App() {
  const [selected, setSelected] = useState(false);
  const [seekInput, setSeekInput] = useState("0");
  const {
    state,
    displayTicks,
    wsStatus,
    commandPending,
    error,
    play,
    pause,
    seek,
  } = useTransport();

  const bbt = ticksToBbt(displayTicks, state.timeSignature, state.ppq);

  return (
    <main className="page">
      <header className="hero">
        <p className="brand">StageSync</p>
        <h1>v5 monorepo</h1>
        <p className="lede">
          Server is the authority (integer ticks + PPQ). Clients may smooth the
          playhead between server ticks only; BBT is display.
        </p>
      </header>

      <section className="transport" aria-label="Transport">
        <h2>Transport</h2>
        <p className="transport-status">
          WS: {wsStatus}
          {state.playing ? " · playing" : " · paused"} · {state.bpm} BPM
        </p>
        <p className="transport-readout" aria-live="polite">
          Bar {toDisplayBar(bbt.bar)} · Beat {bbt.beat} · Tick {bbt.tick}
          <span className="transport-ticks"> ({displayTicks} ticks)</span>
        </p>
        {error ? (
          <p className="transport-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="transport-actions">
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
        <div className="transport-seek">
          <label htmlFor="seek-ticks">
            Seek (ticks)
            <input
              id="seek-ticks"
              type="number"
              value={seekInput}
              disabled={commandPending}
              onChange={(e) => setSeekInput(e.target.value)}
            />
          </label>
          <Button
            variant="ghost"
            loading={commandPending}
            onClick={() => {
              const n = Number.parseInt(seekInput, 10);
              if (Number.isInteger(n)) void seek(n);
            }}
          >
            Apply
          </Button>
        </div>
      </section>

      <section className="showcase" aria-label="Button states">
        <h2>Button — 7 interaction states</h2>
        <div className="grid">
          <figure>
            <Button variant="primary">Default</Button>
            <figcaption>default</figcaption>
          </figure>
          <figure>
            <Button variant="primary" className="force-hover">
              Hover
            </Button>
            <figcaption>hover (:hover)</figcaption>
          </figure>
          <figure>
            <Button variant="primary" className="force-focus">
              Focus
            </Button>
            <figcaption>focus (:focus-visible)</figcaption>
          </figure>
          <figure>
            <Button variant="primary" className="force-active">
              Active
            </Button>
            <figcaption>active (:active)</figcaption>
          </figure>
          <figure>
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <figcaption>disabled</figcaption>
          </figure>
          <figure>
            <Button variant="primary" loading>
              Loading
            </Button>
            <figcaption>loading</figcaption>
          </figure>
          <figure>
            <Button
              variant="secondary"
              selected={selected}
              onClick={() => setSelected((v) => !v)}
            >
              {selected ? "Selected" : "Select"}
            </Button>
            <figcaption>selected (toggle)</figcaption>
          </figure>
        </div>

        <div className="variants">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </section>
    </main>
  );
}
