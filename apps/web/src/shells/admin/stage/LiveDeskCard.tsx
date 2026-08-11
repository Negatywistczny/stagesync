import type { LiveDeskSettingsDto } from "@lib/shell-operator/setlistApi.js";
import { ShellSwitchRow } from "../../ShellSwitchRow.js";
import shell from "../../AdminShell.module.css";
import { AdminAccordionCard } from "../AdminAccordionCard.js";
import styles from "../StageView.module.css";
import type { StageCardId } from "../stagePresence.js";

export function LiveDeskCard({
  compactMobile,
  openCard,
  onOpen,
  liveDesk,
  liveDeskError,
  liveDeskSaving,
  applyLiveDesk,
  setLiveDesk,
}: {
  compactMobile: boolean;
  openCard: StageCardId;
  onOpen: (id: StageCardId) => void;
  liveDesk: LiveDeskSettingsDto | null;
  liveDeskError: string | null;
  liveDeskSaving: boolean;
  applyLiveDesk: (patch: Partial<LiveDeskSettingsDto>) => Promise<void>;
  setLiveDesk: (v: LiveDeskSettingsDto) => void;
}) {
  return (
    <AdminAccordionCard
      id="korekta"
      title="Korekta na scenie"
      titleAs="h1"
      ariaLabel="Korekta na scenie"
      mobile={compactMobile}
      openId={openCard}
      onOpen={onOpen}
      className={styles.masterBar}
      bodyClassName={styles.masterBarBody}
    >
      {liveDeskError ? (
        <p className={shell.error} role="alert">
          {liveDeskError}
        </p>
      ) : null}
      {!liveDesk ? (
        <p className={shell.muted}>Wczytywanie Live Desk…</p>
      ) : (
        <>
          <label className={styles.masterField}>
            Transpozycja zespołu (
            {liveDesk.transpositionSemitones > 0 ? "+" : ""}
            {liveDesk.transpositionSemitones} półtonów)
            <input
              type="range"
              min={-12}
              max={12}
              step={1}
              value={liveDesk.transpositionSemitones}
              disabled={liveDeskSaving}
              onChange={(e) => {
                const n = Number(e.target.value);
                setLiveDesk({ ...liveDesk, transpositionSemitones: n });
              }}
              onMouseUp={() =>
                void applyLiveDesk({
                  transpositionSemitones: liveDesk.transpositionSemitones,
                })
              }
              onTouchEnd={() =>
                void applyLiveDesk({
                  transpositionSemitones: liveDesk.transpositionSemitones,
                })
              }
              onKeyUp={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                  void applyLiveDesk({
                    transpositionSemitones: liveDesk.transpositionSemitones,
                  });
                }
              }}
            />
          </label>
          <label className={styles.masterField}>
            Kompensacja sieci ({liveDesk.syncLeadMs > 0 ? "+" : ""}
            {liveDesk.syncLeadMs} ms)
            <input
              type="range"
              min={-500}
              max={500}
              step={25}
              value={liveDesk.syncLeadMs}
              disabled={liveDeskSaving}
              onChange={(e) => {
                const n = Number(e.target.value);
                setLiveDesk({ ...liveDesk, syncLeadMs: n });
              }}
              onMouseUp={() =>
                void applyLiveDesk({ syncLeadMs: liveDesk.syncLeadMs })
              }
              onTouchEnd={() =>
                void applyLiveDesk({ syncLeadMs: liveDesk.syncLeadMs })
              }
              onKeyUp={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                  void applyLiveDesk({ syncLeadMs: liveDesk.syncLeadMs });
                }
              }}
            />
          </label>
          <div className={styles.masterSwitches}>
            <ShellSwitchRow
              className={styles.masterSwitch}
              checked={liveDesk.clientEditEnabled}
              disabled={liveDeskSaving}
              onChange={(e) => {
                const on = e.target.checked;
                setLiveDesk({ ...liveDesk, clientEditEnabled: on });
                void applyLiveDesk({ clientEditEnabled: on });
              }}
            >
              Edycja zdalna (notatki Formy / tap wokalu)
            </ShellSwitchRow>
          </div>
        </>
      )}
    </AdminAccordionCard>
  );
}
