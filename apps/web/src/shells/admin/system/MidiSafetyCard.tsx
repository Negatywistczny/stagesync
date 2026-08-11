import { Button } from "@stagesync/ui";
import { MetricGrid } from "../../shared/index.js";
import {
  postSafetyNetPromote,
  type MidiHostStatus,
  type SafetyNetStatus,
} from "@lib/shell-operator/setlistApi.js";
import shell from "../AdminShell.module.css";
import { AdminAccordionCard } from "../AdminAccordionCard.js";
import styles from "../SystemView.module.css";
import type { HostCardId } from "./hostTypes.js";

export function MidiSafetyCard({
  compactMobile,
  openCard,
  onOpen,
  midi,
  midiError,
  safety,
  safetyError,
  safetyNote,
  safetyBusy,
  setSafetyBusy,
  setSafety,
  setSafetyError,
  setSafetyNote,
  midiInLabel,
  midiOutLabel,
  rateLabel,
  refreshMidi,
}: {
  compactMobile: boolean;
  openCard: HostCardId;
  onOpen: (id: HostCardId) => void;
  midi: MidiHostStatus | null;
  midiError: string | null;
  safety: SafetyNetStatus | null;
  safetyError: string | null;
  safetyNote: string | null;
  safetyBusy: boolean;
  setSafetyBusy: (v: boolean) => void;
  setSafety: (v: SafetyNetStatus) => void;
  setSafetyError: (v: string | null) => void;
  setSafetyNote: (v: string | null) => void;
  midiInLabel: string;
  midiOutLabel: string;
  rateLabel: (n: number | undefined) => string;
  refreshMidi: () => void | Promise<void>;
}) {
  return (
    <AdminAccordionCard
      id="midi"
      title="MIDI & Safety Net"
      ariaLabel="MIDI i Safety Net"
      mobile={compactMobile}
      openId={openCard}
      onOpen={onOpen}
      className={styles.card}
      bodyClassName={styles.cardBody}
    >
      <div className={styles.midiStack}>
        <div aria-label="Safety Net">
          <p className={styles.sectionLabel}>Safety Net</p>
          {safetyError ? (
            <p className={shell.error} role="alert">
              {safetyError}
            </p>
          ) : null}
          {safetyNote ? (
            <p className={shell.muted} role="status">
              {safetyNote}
            </p>
          ) : null}
          {safety ? (
            <>
              <p className={shell.muted}>
                Rola:{" "}
                <strong>{safety.role === "master" ? "Master" : "Spare"}</strong>
                {safety.midiOutAllowed
                  ? " — MIDI OUT dozwolony"
                  : " — MIDI OUT wyciszony"}
              </p>
              {safety.role === "spare" ? (
                <Button
                  variant="primary"
                  disabled={safetyBusy}
                  onClick={() => {
                    setSafetyBusy(true);
                    setSafetyNote(null);
                    void postSafetyNetPromote()
                      .then((s) => {
                        setSafety(s);
                        setSafetyError(null);
                        if (s.transportPaused) {
                          setSafetyNote(
                            "Przejęto Master — odtwarzanie wstrzymane (PAUSE), playhead zachowany.",
                          );
                        }
                      })
                      .catch((err) => {
                        setSafetyError(
                          err instanceof Error
                            ? err.message
                            : "Promote nieudany",
                        );
                      })
                      .finally(() => setSafetyBusy(false));
                  }}
                >
                  {safetyBusy ? "Przejmowanie…" : "Przejmij (Master)"}
                </Button>
              ) : (
                <p className={shell.muted}>
                  Host jest Masterem. Spare ustawiasz przez{" "}
                  <code>STAGESYNC_SAFETY_ROLE=spare</code>.
                </p>
              )}
            </>
          ) : !safetyError ? (
            <p className={shell.muted}>Ładowanie…</p>
          ) : null}
        </div>

        <div className={styles.sectionSplit} aria-label="Telemetria MIDI">
          <p className={styles.sectionLabel}>Telemetria MIDI</p>
          <div className={styles.midiBody}>
            {midiError ? (
              <p className={shell.error} role="alert">
                {midiError}
              </p>
            ) : null}
            {midi ? (
              <>
                {midi.clockOutActive || midi.lastError ? (
                  <p className={shell.muted}>
                    {[
                      midi.clockOutActive ? "clock OUT aktywny" : null,
                      midi.lastError || null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
                <MetricGrid
                  aria-label="Metryki MIDI"
                  items={[
                    {
                      label: "Clock/s",
                      value: rateLabel(midi.rates.clockPerSec),
                    },
                    {
                      label: "SPP/s",
                      value: rateLabel(midi.rates.sppPerSec),
                    },
                    {
                      label: "PC/s",
                      value: rateLabel(midi.rates.pcPerSec),
                    },
                    {
                      label: "Beat→WS",
                      value: rateLabel(midi.rates.beatToWsPerSec),
                    },
                  ]}
                />
                <div className={styles.midiPorts}>
                  <div
                    className={styles.midiPortRow}
                    role="group"
                    aria-label={`MIDI In: ${midiInLabel}`}
                  >
                    <span className={styles.midiLabel}>Wejście</span>
                    <span className={styles.midiPortValue} title={midiInLabel}>
                      {midiInLabel}
                    </span>
                  </div>
                  <div
                    className={styles.midiPortRow}
                    role="group"
                    aria-label={`MIDI Out: ${midiOutLabel}`}
                  >
                    <span className={styles.midiLabel}>Wyjście</span>
                    <span className={styles.midiPortValue} title={midiOutLabel}>
                      {midiOutLabel}
                    </span>
                  </div>
                  <div
                    className={styles.midiPortRow}
                    role="group"
                    aria-label={
                      midi.config.clockOutEnabled
                        ? "Clock OUT: włączony"
                        : "Clock OUT: wyłączony"
                    }
                  >
                    <span className={styles.midiLabel}>Clock OUT</span>
                    <span className={styles.midiPortValue}>
                      {midi.config.clockOutEnabled ? "włączony" : "wyłączony"}
                    </span>
                  </div>
                </div>
                {!midi.available ? (
                  <p className={shell.muted}>
                    Brak natywnego MIDI w tym środowisku (Docker / CI). Desktop
                    sidecar ładuje urządzenia hosta.
                  </p>
                ) : null}
              </>
            ) : midiError ? null : (
              <p className={shell.muted}>Wczytywanie…</p>
            )}
          </div>
        </div>
      </div>
    </AdminAccordionCard>
  );
}
