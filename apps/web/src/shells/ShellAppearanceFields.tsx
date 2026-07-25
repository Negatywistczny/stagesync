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
  /** When true, switches are inert (e.g. scenic theme lock on Client). */
  disabled?: boolean;
};

export function ShellAppearanceFields({
  value,
  onChange,
  disabled = false,
}: Props = {}) {
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
      if (disabled) return;
      if (controlled) {
        onChange({ ...value, light: checked });
        return;
      }
      setUncontrolled(setAppearance({ light: checked }));
    },
    [controlled, disabled, onChange, value],
  );

  const onContrast = useCallback(
    (checked: boolean) => {
      if (disabled) return;
      if (controlled) {
        onChange({ ...value, highContrast: checked });
        return;
      }
      setUncontrolled(setAppearance({ highContrast: checked }));
    },
    [controlled, disabled, onChange, value],
  );

  return (
    <>
      <ShellSwitchRow
        checked={state.light}
        disabled={disabled}
        onChange={(e) => onLight(e.target.checked)}
      >
        Jasny motyw
      </ShellSwitchRow>
      <ShellSwitchRow
        checked={state.highContrast}
        disabled={disabled}
        onChange={(e) => onContrast(e.target.checked)}
      >
        Wysoki kontrast
      </ShellSwitchRow>
    </>
  );
}
