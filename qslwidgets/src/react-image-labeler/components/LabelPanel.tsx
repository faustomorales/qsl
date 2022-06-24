import React from "react";
import LabelPanelSvelteRaw from "./LabelPanel.svelte";
import toReact from "./library/adapter";
import { LabelData, LabelConfig } from "./library/types";

const LabelPanelSvelte = toReact(LabelPanelSvelteRaw);

type LabelPanelProps = {
  config: LabelConfig[];
  labels: LabelData;
  disabled: boolean;
  setLabels: (labels: LabelData) => void;
  editConfig?: (name: string) => void;
  
};

const LabelPanel: React.FC<LabelPanelProps> = ({
  config,
  labels,
  setLabels,
  disabled,
  editConfig,
}) => (
  <LabelPanelSvelte
    config={config}
    labels={labels}
    disabled={disabled}
    editableConfig={!!editConfig}
    onChange={(event: any) => setLabels(event.detail.labels)}
    onEditConfig={(event: any) => editConfig!(event.detail.name)}
  />
);

export default LabelPanel;
