import React from "react";
import { Box } from "@mui/material";
import LabelPanelEntry from "./LabelPanelEntry";
import { LabelData, LabelConfig } from "./library/types";

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
}) => {
  const setSelected = React.useCallback(
    (name: string, selected: string[]) =>
      setLabels({ ...labels, [name]: selected }),
    [labels]
  );
  return (
    <Box ml={-3} mr={-3}>
      {config.map((c, i) => (
        <LabelPanelEntry
          key={c.name}
          config={c}
          disabled={disabled}
          editConfig={editConfig}
          selected={labels[c.name]}
          setSelected={setSelected}
        />
      ))}
    </Box>
  );
};

export default LabelPanel;
