import { useCallback, useEffect, useState } from "react";
import {
  applyAppearance,
  readAppearance,
  setAppearance,
  type AppearanceState,
} from "../lib/appearance.js";
import { ShellSwitchRow } from "./ShellSwitchRow.js";

type Props = {
  /** Controlled draft (Preferences). When set with onChange, does not persist. */
  value?: AppearanceState;
  onChange?: (next: AppearanceState) => void;
};

export function ShellAppearanceFields({ value, onChange }: Props = {}) {
  const controlled = value !== undefined && onChange !== undefined;
  const [uncontrolled, setUncontrolled] = useState<AppearanceState>(() =>
    readAppearance(),
  );
  const state = controlled ? value : uncontrolled;

  useEffect(() => {
    if (!controlled) applyAppearance(state);
  }, [controlled, state]);

  const onLight = useCallback(
    (checked: boolean) => {
      if (controlled) {
        onChange({ ...value, light: checked });
        return;
      }
      setUncontrolled(setAppearance({ light: checked }));
    },
    [controlled, onChange, value],
  );

  const onContrast = useCallback(
    (checked: boolean) => {
      if (controlled) {
        onChange({ ...value, highContrast: checked });
        return;
      }
      setUncontrolled(setAppearance({ highContrast: checked }));
    },
    [controlled, onChange, value],
  );

  return (
    <>
      <ShellSwitchRow
        checked={state.light}
        onChange={(e) => onLight(e.target.checked)}
      >
        Jasny motyw
      </ShellSwitchRow>
      <ShellSwitchRow
        checked={state.highContrast}
        onChange={(e) => onContrast(e.target.checked)}
      >
        Wysoki kontrast
      </ShellSwitchRow>
    </>
  );
}
