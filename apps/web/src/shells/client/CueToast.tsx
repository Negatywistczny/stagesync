import React from "react";
import {
  stageCueBannerLabel,
  type StageCueBannerItem,
} from "@stagesync/shared";

export function CueToast({
  item,
  flash,
  styles: s,
}: {
  item: StageCueBannerItem;
  flash: boolean;
  styles: Record<string, string>;
}) {
  const className = [
    s.cueToast,
    item.slot === "upcoming" ? s.cueToastNext : s.cueToastNow,
    item.priority === "alert" && item.slot === "now" ? s.cueToastAlert : "",
    flash ? s.cueToastFlash : "",
    s.cueToastVisible,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className} role="status">
      <span className={s.cueToastLabel}>{stageCueBannerLabel(item)}</span>
      <span className={s.cueToastText}>{item.text}</span>
    </div>
  );
}
