import styles from "../ClientShell.module.css";
import type { ChordNameParts } from "@stagesync/shared";
import { cycleTotalBars, type GridCycleStep } from "@lib/timeline/clientGrid.js";
import { ChordName } from "./ChordName.js";
import { CHORD_NAME_CLASSES, slotBarUnitsStyle } from "./gridPaneUtils.js";

export function CycleRow({
  cycle,
  fmtParts,
  active,
}: {
  cycle: GridCycleStep[];
  fmtParts: (symbol: string) => ChordNameParts;
  active: boolean;
}) {
  const totalBars = cycleTotalBars(cycle);
  if (cycle.length === 0 || totalBars <= 0) return null;

  const hasActiveStep = cycle.some((s) => s.active);

  return (
    <div className={styles.cycleRow} aria-label="Cykl akordów">
      {cycle.map((step, i) => {
        const parts = fmtParts(step.symbol);
        const isCdDigit = /^\d+$/.test(step.symbol.trim());
        const cellActive =
          active && (step.active || (!hasActiveStep && i === 0));
        return (
          <div
            key={`${step.symbol}-${i}-${step.bars}`}
            className={[
              styles.cycleCell,
              cellActive ? styles.cycleCellActive : "",
              isCdDigit ? styles.cycleCellCountdown : "",
              step.isSubBar ? styles.cycleCellSubBar : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={slotBarUnitsStyle(step.bars)}
            data-chord={step.symbol}
            title={
              step.bars > 1
                ? `${parts.plain} · ${step.bars} takty`
                : parts.plain
            }
            aria-label={
              step.bars > 1
                ? `${parts.plain} · ${step.bars} takty`
                : parts.plain
            }
          >
            <span className={styles.cycleCellSymbol}>
              {isCdDigit ? (
                parts.plain
              ) : (
                <ChordName
                  parts={parts}
                  classNames={CHORD_NAME_CLASSES}
                  bassLayout="stack"
                />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
