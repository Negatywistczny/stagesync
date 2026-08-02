import { type AppearanceState } from "../../../lib/appearance.js";
import { type ClockDisplayFormat } from "../../../lib/clockDisplayPrefs.js";
import { ShellAppearanceFields } from "../../ShellAppearanceFields.js";
import { ShellNotificationFields } from "../../ShellNotificationFields.js";
import { DeviceNameFields } from "../../DeviceNameFields.js";
import { ChangeServerControl } from "../../ChangeServerControl.js";
import styles from "../../ServerSettingsModal.module.css";

interface GeneralSettingsTabProps {
  appearance: AppearanceState;
  onAppearanceChange: (appearance: AppearanceState) => void;
  clockFormat: ClockDisplayFormat;
  onClockFormatChange: (format: ClockDisplayFormat) => void;
  deviceName: string;
  onDeviceNameChange: (name: string) => void;
  deviceNameError: string | null;
}

export function GeneralSettingsTab({
  appearance,
  onAppearanceChange,
  clockFormat,
  onClockFormatChange,
  deviceName,
  onDeviceNameChange,
  deviceNameError,
}: GeneralSettingsTabProps) {
  return (
    <div className={styles.body} role="tabpanel">
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Wygląd</legend>
        <div className={styles.controlStack}>
          <ShellAppearanceFields
            value={appearance}
            onChange={onAppearanceChange}
          />
          <ShellNotificationFields />
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Format zegara</legend>
        <div className={styles.controlStack}>
          <label className={styles.radioRow}>
            <input
              type="radio"
              name="clock-format"
              checked={clockFormat === "bbt"}
              aria-label="Format zegara BBT (Takt.Beat)"
              onChange={() => onClockFormatChange("bbt")}
            />
            <span>BBT (Takt.Beat)</span>
          </label>
          <label className={styles.radioRow}>
            <input
              type="radio"
              name="clock-format"
              checked={clockFormat === "time"}
              aria-label="Format zegara MM:SS.ms"
              onChange={() => onClockFormatChange("time")}
            />
            <span>MM:SS.ms</span>
          </label>
        </div>
      </fieldset>

      <DeviceNameFields
        value={deviceName}
        onChange={onDeviceNameChange}
        error={deviceNameError}
      />
      <ChangeServerControl entryPath="/admin" />
    </div>
  );
}
