import { resolveFormaClipAt, resolveMeterAt, ticksToBbt, toDisplayBar, type Project } from "@stagesync/shared";
import styles from "../ClientShell.module.css";

type DrumsPaneProps = {
  project: Project;
  displayTicks: number;
};

export function DrumsPane({ project, displayTicks }: DrumsPaneProps) {
  const section = resolveFormaClipAt(project, displayTicks);
  const meter = resolveMeterAt(project, displayTicks);
  const bbt = ticksToBbt(displayTicks, meter, project.ppq);

  return (
    <div className={styles.formaPane}>
      <p className={styles.formaTitle}>{project.name}</p>
      <p className={styles.formaSection}>{section?.name ?? "—"}</p>
      <p className={styles.muted}>
        takt {toDisplayBar(bbt.bar)}.{bbt.beat}
      </p>
    </div>
  );
}
