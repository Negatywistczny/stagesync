import { useCallback, useEffect, useState } from "react";
import {
  APPEARANCE_PROFILE_IDS,
  APPEARANCE_PROFILE_LABELS,
  APPEARANCE_PROFILE_SWATCHES,
  type AppearanceProfileId,
} from "@stagesync/shared";
import { Field } from "@stagesync/ui";
import {
  applyAppearance,
  readAppearance,
  setAppearance,
  type AppearanceState,
} from "../lib/appearance.js";
import styles from "./ShellAppearanceFields.module.css";

type Props = {
  /** Controlled draft (Preferences). When set with onChange, does not persist. */
  value?: AppearanceState;
  onChange?: (next: AppearanceState) => void;
};

export function ShellAppearanceFields({
  value,
  onChange,
}: Props = {}) {
  const controlled = value !== undefined && onChange !== undefined;
  const [uncontrolled, setUncontrolled] = useState<AppearanceState>(() =>
    readAppearance(),
  );
  const state = controlled ? value : uncontrolled;

  useEffect(() => {
    if (!controlled) applyAppearance(state);
  }, [controlled, state]);

  const onProfile = useCallback(
    (profile: AppearanceProfileId) => {
      if (controlled) {
        onChange({ profile });
        return;
      }
      setUncontrolled(setAppearance({ profile }));
    },
    [controlled, onChange],
  );

  return (
    <Field label="Motyw">
      <div
        role="radiogroup"
        aria-label="Motyw kolorystyczny"
        className={styles.list}
      >
        {APPEARANCE_PROFILE_IDS.map((id) => {
          const selected = state.profile === id;
          const swatch = APPEARANCE_PROFILE_SWATCHES[id];
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={
                selected
                  ? `${styles.option} ${styles.optionSelected}`
                  : styles.option
              }
              onClick={() => onProfile(id)}
            >
              <span className={styles.swatches} aria-hidden="true">
                <span
                  className={styles.dot}
                  style={{ backgroundColor: swatch.bg }}
                />
                <span
                  className={styles.dot}
                  style={{ backgroundColor: swatch.primary }}
                />
              </span>
              <span className={styles.label}>
                {APPEARANCE_PROFILE_LABELS[id]}
              </span>
            </button>
          );
        })}
      </div>
    </Field>
  );
}
