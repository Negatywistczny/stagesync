import { Component, type ReactNode, type Ref } from "react";

/**
 * Freeze React reconciliation after mount so tick re-renders cannot wipe
 * imperative motion classes / textContent (fly, exit, slotHidden).
 */
export class StaticDomAnchor extends Component<{
  domRef: Ref<HTMLDivElement>;
  className: string;
  initialHtml: string;
  datasetChord?: string;
}> {
  override shouldComponentUpdate() {
    return false;
  }
  override render(): ReactNode {
    const { domRef, className, initialHtml, datasetChord } = this.props;
    return (
      <div
        ref={domRef}
        className={className}
        data-chord-display={datasetChord ?? ""}
        dangerouslySetInnerHTML={{ __html: initialHtml }}
      />
    );
  }
}
