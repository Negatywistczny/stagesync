import { useState } from "react";
import { Button } from "@stagesync/ui";
import { ShellNav } from "./ShellNav.js";
import styles from "./TimelineShell.module.css";

type Tool = "select" | "split" | "slip" | "zoom";

const TOOLS: { id: Tool; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "split", label: "Split" },
  { id: "slip", label: "Slip" },
  { id: "zoom", label: "Zoom" },
];

const TRACKS = [
  {
    label: "Sekcje",
    clips: [
      { name: "Intro", tone: "a" },
      { name: "Verse", tone: "b" },
    ],
  },
  {
    label: "Akordy",
    clips: [
      { name: "Am — F — C", tone: "c" },
      { name: "G — Em", tone: "d" },
    ],
  },
  {
    label: "Tekst",
    clips: [{ name: "Waiting on the…", tone: "e" }],
  },
  {
    label: "Tempo",
    clips: [{ name: "118", tone: "f" }],
  },
  {
    label: "Metrum",
    clips: [{ name: "4/4", tone: "g" }],
  },
] as const;

export function TimelineShell() {
  const [tool, setTool] = useState<Tool>("select");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [selectedClip, setSelectedClip] = useState("Intro");

  return (
    <div
      className={[
        styles.shell,
        sidebarCollapsed ? styles.sidebarCollapsed : "",
        inspectorCollapsed ? styles.inspectorCollapsed : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          Timeline
          <span className={styles.brandSub}>szkielet</span>
        </div>
        <ShellNav />
        <div className={styles.tools} aria-label="Narzędzia">
          {TOOLS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={[
                styles.tool,
                tool === item.id ? styles.toolActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={tool === item.id}
              title={item.label}
              onClick={() => setTool(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className={styles.context}>
          <strong>Midnight Express</strong>
          <span>placeholder</span>
        </div>
        <div className={styles.actions}>
          <Button
            variant="ghost"
            selected={!sidebarCollapsed}
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-expanded={!sidebarCollapsed}
          >
            Setlista
          </Button>
          <Button
            variant="ghost"
            selected={!inspectorCollapsed}
            onClick={() => setInspectorCollapsed((v) => !v)}
            aria-expanded={!inspectorCollapsed}
          >
            Inspector
          </Button>
          <Button variant="primary" disabled title="Wkrótce">
            Zapisz
          </Button>
        </div>
      </header>

      {!sidebarCollapsed ? (
        <aside className={styles.sidebar} aria-label="Setlista">
          <div className={styles.panelHeader}>
            <h2>Setlista</h2>
          </div>
          <div className={styles.panelBody}>
            <div className={[styles.listRow, styles.listSelected].join(" ")}>
              <div className={styles.listTitle}>Midnight Express</div>
              <div className={styles.listMeta}>01 · placeholder</div>
            </div>
            <div className={styles.listRow}>
              <div className={styles.listTitle}>Harbor Lights</div>
              <div className={styles.listMeta}>02 · placeholder</div>
            </div>
          </div>
        </aside>
      ) : null}

      <div className={styles.canvas} aria-label="Canvas timeline">
        <div className={styles.ruler}>
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <div className={styles.tracks}>
          <div className={styles.playhead} aria-hidden="true" />
          {TRACKS.map((track) => (
            <div key={track.label} className={styles.track}>
              <div className={styles.trackLabel}>{track.label}</div>
              <div className={styles.trackLane}>
                {track.clips.map((clip) => {
                  const toneClass = {
                    a: styles.toneA,
                    b: styles.toneB,
                    c: styles.toneC,
                    d: styles.toneD,
                    e: styles.toneE,
                    f: styles.toneF,
                    g: styles.toneG,
                  }[clip.tone];
                  return (
                    <button
                      key={clip.name}
                      type="button"
                      className={[
                        styles.clip,
                        toneClass,
                        selectedClip === clip.name ? styles.clipSelected : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setSelectedClip(clip.name)}
                    >
                      {clip.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!inspectorCollapsed ? (
        <aside className={styles.inspector} aria-label="Inspector">
          <div className={styles.panelHeader}>
            <h2>Inspector</h2>
            <Button
              variant="ghost"
              onClick={() => setInspectorCollapsed(true)}
              aria-label="Zwiń inspector"
            >
              ×
            </Button>
          </div>
          <div className={styles.panelBody}>
            <p className={styles.detailTitle}>{selectedClip}</p>
            <p className={styles.muted}>
              Placeholder — drag / edycja w kolejnym PR. Narzędzie: {tool}.
            </p>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
