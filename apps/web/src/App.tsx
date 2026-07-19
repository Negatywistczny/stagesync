import { useState } from "react";
import { Button } from "@stagesync/ui";
import { absBeatToBarBeat } from "@stagesync/shared";
import "./App.css";

export default function App() {
  const [selected, setSelected] = useState(false);
  const sample = absBeatToBarBeat(5.5, { numerator: 5, denominator: 8 });

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
            <Button variant="primary" className="force-focus" autoFocus>
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

      <p className="meta">
        Shared time stub: absBeat 5.5 @ 5/8 → bar {sample.bar}, beat{" "}
        {sample.beatInBar}
      </p>
    </main>
  );
}
