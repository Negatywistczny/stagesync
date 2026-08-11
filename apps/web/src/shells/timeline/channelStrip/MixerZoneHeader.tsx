import { ZoneEyeToggle } from "./ZoneEyeToggle.js";
import styles from "./MixerSurface.module.css";

export function MixerZoneHeader({
  title,
  visible,
  onToggle,
  addAriaLabel,
  addTitle,
  onAdd,
  addDisabled,
}: {
  title: string;
  visible: boolean;
  onToggle: () => void;
  addAriaLabel?: string;
  addTitle?: string;
  onAdd?: () => void;
  addDisabled?: boolean;
}) {
  return (
    <div className={styles.zoneHead}>
      <div className={styles.zoneHeadStart}>
        <span className={styles.zoneTitle}>{title}</span>
        <ZoneEyeToggle
          zoneLabel={title}
          visible={visible}
          onToggle={onToggle}
        />
      </div>
      {visible && onAdd ? (
        <button
          type="button"
          className={styles.addBusBtn}
          aria-label={addAriaLabel}
          title={addTitle ?? addAriaLabel}
          disabled={addDisabled}
          onClick={(e) => {
            e.stopPropagation();
            if (addDisabled) return;
            onAdd();
          }}
        >
          + Dodaj
        </button>
      ) : null}
    </div>
  );
}
