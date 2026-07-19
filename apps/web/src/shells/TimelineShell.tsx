import { useId, useState } from "react";
import { Button } from "@stagesync/ui";
import { ShellNav } from "./ShellNav.js";
import styles from "./TimelineShell.module.css";

type Tool = "pointer" | "pencil" | "eraser" | "scissors" | "tap";

const TOOLS: { id: Tool; label: string }[] = [
  { id: "pointer", label: "Pointer" },
  { id: "pencil", label: "Pencil" },
  { id: "eraser", label: "Eraser" },
  { id: "scissors", label: "Scissors" },
  { id: "tap", label: "Tap" },
];

const CONTENT_TRACKS = [
  { id: "form", label: "Forma", clips: ["Intro", "Verse"] },
  { id: "lyrics", label: "Tekst", clips: ["Waiting on the…"] },
  { id: "chords", label: "Akordy", clips: ["Am — F — C"] },
  { id: "cue", label: "Cue", clips: ["Fill → verse"] },
] as const;

const SPECIAL_TRACKS = [
  { id: "tempo", label: "Tempo", clips: ["118"] },
  { id: "key", label: "Tonacja", clips: ["Am"] },
  { id: "meter", label: "Metrum", clips: ["4/4"] },
  { id: "anchors", label: "Kotwice", clips: ["scoreBarMap"] },
] as const;

type AudioTrack = { id: string; name: string };

export function TimelineShell() {
  const idPrefix = useId();
  const [tool, setTool] = useState<Tool>("pointer");
  const [showSpecial, setShowSpecial] = useState(false);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [selected, setSelected] = useState<string | null>("Intro");

  function addAudioTrack() {
    const n = audioTracks.length + 1;
    const id = `${idPrefix}-audio-${n}`;
    setAudioTracks((prev) => [...prev, { id, name: `Audio ${n}` }]);
    setSelected(`Audio ${n}`);
  }

  function removeAudioTrack(id: string) {
    setAudioTracks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          Timeline
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
              onClick={() => setTool(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className={styles.badge} title="Źródło transportu">
          MIDI / Timeline
        </span>
        <div className={styles.actions}>
          <Button variant="ghost" disabled title="Wkrótce">
            ←
          </Button>
          <Button variant="ghost" disabled title="Wkrótce">
            →
          </Button>
          <Button
            variant="ghost"
            selected={showSpecial}
            onClick={() => setShowSpecial((v) => !v)}
          >
            Specjalne
          </Button>
          <Button variant="primary" disabled title="Wkrótce">
            Zapisz
          </Button>
        </div>
      </header>

      <aside className={styles.sidebar} aria-label="Biblioteka">
        <div className={styles.sideHead}>
          <h2 className={styles.sideTitle}>Biblioteka</h2>
        </div>
        <p className={styles.muted}>Ze wzoru · Import UG — wkrótce.</p>
        <div className={styles.listRow}>
          <div className={styles.listTitle}>Midnight Express</div>
          <div className={styles.listMeta}>placeholder</div>
        </div>
      </aside>

      <div className={styles.canvas} aria-label="Canvas timeline">
        <div className={styles.ruler}>
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <div className={styles.tracks}>
          <div className={styles.playhead} aria-hidden="true" />

          <p className={styles.groupLabel}>Treść</p>
          {CONTENT_TRACKS.map((track) => (
            <TrackRow
              key={track.id}
              label={track.label}
              clips={[...track.clips]}
              selected={selected}
              onSelect={setSelected}
            />
          ))}

          {showSpecial ? (
            <>
              <p className={styles.groupLabel}>Specjalne</p>
              {SPECIAL_TRACKS.map((track) => (
                <TrackRow
                  key={track.id}
                  label={track.label}
                  clips={[...track.clips]}
                  selected={selected}
                  onSelect={setSelected}
                />
              ))}
            </>
          ) : null}

          <div className={styles.audioHead}>
            <p className={styles.groupLabel}>Audio (0…N)</p>
            <Button variant="secondary" onClick={addAudioTrack}>
              Dodaj ścieżkę audio
            </Button>
          </div>
          {audioTracks.length === 0 ? (
            <p className={styles.muted}>Brak ścieżek audio — to normalny stan.</p>
          ) : (
            audioTracks.map((track) => (
              <div key={track.id} className={styles.track}>
                <div className={styles.trackLabelRow}>
                  <span className={styles.trackLabel}>{track.name}</span>
                  <button
                    type="button"
                    className={styles.removeAudio}
                    onClick={() => removeAudioTrack(track.id)}
                    aria-label={`Usuń ${track.name}`}
                  >
                    ×
                  </button>
                </div>
                <div className={styles.trackLane}>
                  <button
                    type="button"
                    className={[
                      styles.clip,
                      styles.clipAudio,
                      selected === track.name ? styles.clipSelected : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelected(track.name)}
                  >
                    clip (placeholder)
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <aside className={styles.inspector} aria-label="Inspector">
        <div className={styles.sideHead}>
          <h2 className={styles.sideTitle}>Właściwości</h2>
        </div>
        <p className={styles.detailTitle}>{selected ?? "Metadane utworu"}</p>
        <p className={styles.muted}>
          Narzędzie: {tool}. Drag / edycja / MIDI — kolejne PR. Audio: lokalny
          szkielet 0…N bez API.
        </p>
      </aside>
    </div>
  );
}

function TrackRow({
  label,
  clips,
  selected,
  onSelect,
}: {
  label: string;
  clips: string[];
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  return (
    <div className={styles.track}>
      <div className={styles.trackLabel}>{label}</div>
      <div className={styles.trackLane}>
        {clips.map((name) => (
          <button
            key={name}
            type="button"
            className={[
              styles.clip,
              selected === name ? styles.clipSelected : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onSelect(name)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
