import { useCallback, useEffect, useState } from "react";
import {
  applyAppearance,
  readAppearance,
  setAppearance,
  type AppearanceState,
} from "../lib/appearance.js";
import { ShellSwitchRow } from "./ShellSwitchRow.js";

export function ShellAppearanceFields() {
  const [state, setState] = useState<AppearanceState>(() => readAppearance());

  useEffect(() => {
    applyAppearance(state);
  }, [state]);

  const onLight = useCallback((checked: boolean) => {
    setState(setAppearance({ light: checked }));
  }, []);

  const onContrast = useCallback((checked: boolean) => {
    setState(setAppearance({ highContrast: checked }));
  }, []);

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
