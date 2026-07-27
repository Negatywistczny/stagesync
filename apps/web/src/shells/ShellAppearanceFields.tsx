import { useCallback, useEffect, useState } from "react";
import {
  APPEARANCE_PROFILE_IDS,
  APPEARANCE_PROFILE_LABELS,
  type AppearanceProfileId,
} from "@stagesync/shared";
import { Field, Select } from "@stagesync/ui";
import {
  applyAppearance,
  readAppearance,
  setAppearance,
  type AppearanceState,
} from "../lib/appearance.js";

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
    <Field label="Motyw" htmlFor="ss-appearance-profile">
      <Select
        id="ss-appearance-profile"
        aria-label="Motyw kolorystyczny"
        value={state.profile}
        onChange={(e) =>
          onProfile(e.target.value as AppearanceProfileId)
        }
      >
        {APPEARANCE_PROFILE_IDS.map((id) => (
          <option key={id} value={id}>
            {APPEARANCE_PROFILE_LABELS[id]}
          </option>
        ))}
      </Select>
    </Field>
  );
}
