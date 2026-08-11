import { Button } from "@stagesync/ui";
import { IconEye, IconEyeOff } from "../../icons.js";
import styles from "./MixerSurface.module.css";

export function ZoneEyeToggle({
  zoneLabel,
  visible,
  onToggle,
}: {
  zoneLabel: string;
  visible: boolean;
  onToggle: () => void;
}) {
  const label = visible
    ? `Ukryj strefę ${zoneLabel}`
    : `Pokaż strefę ${zoneLabel}`;
  return (
    <Button
      type="button"
      variant="ghost"
      iconOnly
      className={styles.zoneEye}
      aria-label={label}
      title={label}
      aria-pressed={visible}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {visible ? <IconEye /> : <IconEyeOff />}
    </Button>
  );
}
