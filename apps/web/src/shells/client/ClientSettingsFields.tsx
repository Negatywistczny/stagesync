import React, { useState } from "react";
import { Button } from "@stagesync/ui";
import {
  INSTRUMENT_PITCH_MANUAL_MAX,
  INSTRUMENT_PITCH_MANUAL_MIN,
  type InstrumentPitchMode,
} from "@stagesync/shared";
import {
  setFormNotesEdit,
  setGridAnimations,
  setHybridPolishB,
  setInstrumentPitch,
  setInstrumentPitchManual,
  setLiteralQuality,
  setSectionNamesPolish,
  type ClientDisplayPrefs,
} from "@lib/client/clientDisplayPrefs.js";
import {
  clampScoreZoom,
  SCORE_ZOOM_DEFAULT,
  SCORE_ZOOM_MAX,
  SCORE_ZOOM_MIN,
  SCORE_ZOOM_STEP,
} from "@lib/timeline-edit/scorePlayhead.js";
import {
  clampScoreOctave,
  type ScoreOctave,
  type ScorePartInfo,
} from "@lib/timeline-edit/scoreOsmd.js";
import { ChangeServerControl } from "../components/ChangeServerControl.js";
import { OperatorPinFields } from "../components/OperatorPinFields.js";
import { ShellAppearanceFields } from "../settings/SettingsPopover.js";
import { ShellNotificationFields } from "../settings/ShellNotificationFields.js";
import { ShellSwitchRow } from "../components/ShellSwitchRow.js";
import styles from "./ClientShell.module.css";

const PITCH_OPTIONS: {
  id: InstrumentPitchMode;
  icon: string;
  label: string;
  title: string;
  manualIcon?: boolean;
}[] = [
  { id: "concert", icon: "🎹", label: "C", title: "Strój koncertowy (C)" },
  {
    id: "bb",
    icon: "🎺",
    label: "B♭",
    title: "Instrument B♭ — korekta +2 półtony",
  },
  {
    id: "eb",
    icon: "🎷",
    label: "E♭",
    title: "Instrument E♭ — korekta +9 półtonów",
  },
  {
    id: "manual",
    icon: "±",
    label: "Ręczna",
    title: "Ręczna — korekta −6…+6 półtonów",
    manualIcon: true,
  },
];

export function GlobalSettingsFields({
  prefs,
  onPrefsChange,
}: {
  prefs: ClientDisplayPrefs;
  onPrefsChange: (prefs: ClientDisplayPrefs) => void;
}) {
  return (
    <>
      <p className={styles.fieldLab}>Wygląd</p>
      <ShellAppearanceFields />
      <ShellNotificationFields />
      <p className={styles.fieldLab}>Strój instrumentu</p>
      <div
        className={styles.pitchToggle}
        role="group"
        aria-label="Strój instrumentu transponującego"
      >
        {PITCH_OPTIONS.map((opt) => {
          const on = prefs.instrumentPitch === opt.id;
          return (
            <Button
              key={opt.id}
              variant="ghost"
              selected={on}
              className={styles.pitchOption}
              title={opt.title}
              aria-label={opt.title}
              onClick={() => {
                setInstrumentPitch(opt.id);
                onPrefsChange({ ...prefs, instrumentPitch: opt.id });
              }}
            >
              <span
                className={[
                  styles.pitchIcon,
                  opt.manualIcon ? styles.pitchIconManual : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden
              >
                {opt.icon}
              </span>
              <span className={styles.pitchLabel}>{opt.label}</span>
            </Button>
          );
        })}
      </div>
      {prefs.instrumentPitch === "manual" ? (
        <label className={styles.field}>
          Transpozycja ({prefs.instrumentPitchManual > 0 ? "+" : ""}
          {prefs.instrumentPitchManual})
          <input
            className={styles.prefsRange}
            type="range"
            min={INSTRUMENT_PITCH_MANUAL_MIN}
            max={INSTRUMENT_PITCH_MANUAL_MAX}
            step={1}
            value={prefs.instrumentPitchManual}
            onChange={(e) => {
              const n = Number(e.target.value);
              setInstrumentPitchManual(n);
              onPrefsChange({ ...prefs, instrumentPitchManual: n });
            }}
          />
        </label>
      ) : null}
      <ShellSwitchRow
        checked={prefs.sectionNamesPolish}
        onChange={(e) => {
          const next = e.target.checked;
          setSectionNamesPolish(next);
          onPrefsChange({ ...prefs, sectionNamesPolish: next });
        }}
      >
        Polskie nazwy sekcji
      </ShellSwitchRow>
      <OperatorPinFields />
      <ChangeServerControl entryPath="/client" />
    </>
  );
}

export function RoleSettingsFields({
  role,
  prefs,
  onPrefsChange,
  vocalTapOn,
  onVocalTapToggle,
  scoreZoom,
  onScoreZoomChange,
  scoreFollowPlayhead,
  onScoreFollowPlayheadChange,
  scoreOctave,
  onScoreOctaveChange,
  scoreParts,
  scoreHiddenPartIds,
  onScorePartVisible,
}: {
  role: string;
  prefs: ClientDisplayPrefs;
  onPrefsChange: (prefs: ClientDisplayPrefs) => void;
  vocalTapOn: boolean;
  onVocalTapToggle: (on: boolean) => void;
  scoreZoom: number;
  onScoreZoomChange: (percent: number) => void;
  scoreFollowPlayhead: boolean;
  onScoreFollowPlayheadChange: (on: boolean) => void;
  scoreOctave: ScoreOctave;
  onScoreOctaveChange: (octave: ScoreOctave) => void;
  scoreParts: ScorePartInfo[];
  scoreHiddenPartIds: readonly string[];
  onScorePartVisible: (partId: string, visible: boolean) => void;
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

  if (role === "karaoke") {
    return (
      <>
        <label className={styles.field}>
          Skala tekstu ({textScale}%)
          <input
            className={styles.prefsRange}
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
    const bumpZoom = (delta: number) => {
      onScoreZoomChange(clampScoreZoom(scoreZoom + delta));
    };
    return (
      <>
        <div className={styles.scoreZoomRow}>
          <Button
            variant="ghost"
            iconOnly
            aria-label="Pomniejsz partyturę"
            onClick={() => bumpZoom(-SCORE_ZOOM_STEP)}
            disabled={scoreZoom <= SCORE_ZOOM_MIN}
          >
            −
          </Button>
          <span className={styles.scoreZoomLabel}>{scoreZoom}%</span>
          <Button
            variant="ghost"
            iconOnly
            aria-label="Powiększ partyturę"
            onClick={() => bumpZoom(SCORE_ZOOM_STEP)}
            disabled={scoreZoom >= SCORE_ZOOM_MAX}
          >
            +
          </Button>
          <Button
            variant="ghost"
            aria-label="Resetuj zoom partytury"
            onClick={() => onScoreZoomChange(SCORE_ZOOM_DEFAULT)}
          >
            Reset
          </Button>
        </div>
        <label className={styles.scoreOctaveField}>
          Oktawa
          <select
            className={styles.scoreOctaveSelect}
            aria-label="Transpozycja oktawy partytury"
            value={String(scoreOctave)}
            onChange={(e) =>
              onScoreOctaveChange(clampScoreOctave(e.target.value))
            }
          >
            <option value="-1">−1</option>
            <option value="0">0</option>
            <option value="1">+1</option>
          </select>
        </label>
        <ShellSwitchRow
          checked={scoreFollowPlayhead}
          onChange={(e) => onScoreFollowPlayheadChange(e.target.checked)}
        >
          Śledź wskaźnik odtwarzania
        </ShellSwitchRow>
        {scoreParts.length > 1 ? (
          <div
            className={styles.scoreParts}
            role="group"
            aria-label="Widoczne partie"
          >
            {scoreParts.map((part) => {
              const on = !scoreHiddenPartIds.includes(part.id);
              return (
                <label key={part.id} className={styles.scorePartItem}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) =>
                      onScorePartVisible(part.id, e.target.checked)
                    }
                  />
                  <span>{part.label}</span>
                </label>
              );
            })}
          </div>
        ) : null}
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
