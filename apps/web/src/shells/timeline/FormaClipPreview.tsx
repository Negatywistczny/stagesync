import styles from "../TimelineShell.module.css";

/**
 * Ephemeral pencil-draw / Option-copy ghost clip.
 * Must mirror committed clip label DOM (`.formaClipLabel`) so inset and
 * alignment match FormaClipButton.
 */
export function FormaClipPreview({
  label,
  style,
}: {
  label: string;
  style: { left: string; width: string };
}) {
  return (
    <div
      className={[styles.clip, styles.formaClip, styles.formaPreview].join(" ")}
      style={style}
      aria-hidden
      data-testid="forma-clip-preview"
    >
      <span className={styles.formaClipLabel}>{label}</span>
    </div>
  );
}
