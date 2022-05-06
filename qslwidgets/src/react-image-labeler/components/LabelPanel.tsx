import React from "react";
import { Box } from "@mui/material";
import LabelPanelEntry from "./LabelPanelEntry";
import { LabelData, LabelConfig } from "./library/types";

type LabelPanelProps = {
  config: LabelConfig[];
  labels: LabelData;
  disabled: boolean;
  setLabels: (labels: LabelData) => void;
  editConfig?: (index: number) => void;
};

const LabelPanel: React.FC<LabelPanelProps> = ({
  config,
  labels,
  setLabels,
  disabled,
  editConfig,
}) => {
  return (
    <Box ml={-3} mr={-3}>
      {config.map((c, i) => (
        <LabelPanelEntry
          key={c.name}
          config={c}
          disabled={disabled}
          editConfig={editConfig ? () => editConfig(i) : undefined}
          selected={labels[c.name]}
          setSelected={(selected) =>
            setLabels({ ...labels, [c.name]: selected })
          }
        />
      ))}
    </Box>
  );
};

export default LabelPanel;
