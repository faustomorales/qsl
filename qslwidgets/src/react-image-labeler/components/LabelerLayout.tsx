import React from "react";
import { Box, Stack } from "@mui/material";
import ClickTarget from "./ClickTarget";
import Metadata from "./Metadata";
import ProgressBar from "./ProgressBar";
import { useMediaLarge } from "./library/hooks";

const LabelerLayout: React.FC<{
  control: React.ReactNode;
  content: React.ReactNode;
  layout?: "horizontal" | "vertical";
  metadata?: { [key: string]: string };
  progress?: number;
}> = ({ layout = "horizontal", control, content, metadata, progress }) => {
  const isLarge = useMediaLarge();
  return (
    <Box>
      {progress !== undefined && progress >= 0 ? (
        <Box sx={{ mb: 1 }}>
          <ProgressBar progress={progress} />
        </Box>
      ) : null}
      <Box
        style={{
          display: "grid",
          gridTemplateColumns:
            content || metadata
              ? layout === "horizontal" && isLarge
                ? `315px 1fr`
                : `1fr`
              : `1fr`,
          gridTemplateRows: "auto",
          gridTemplateAreas:
            content || metadata
              ? layout === "horizontal" && isLarge
                ? '"control-panel image-target"'
                : '"image-target" "control-panel"'
              : '"control-panel"',
          gridColumnGap: content || metadata ? 20 : 0,
          rowGap: content || metadata ? 20 : 0,
          position: "relative",
        }}
      >
        <Box style={{ position: "relative", gridArea: "control-panel" }}>
          <ClickTarget />
          {control}
        </Box>
        <Box style={{ position: "relative", gridArea: "image-target" }}>
          <ClickTarget />
          <Stack rowGap={1}>
            {content}
            {metadata ? (
              <Box sx={{ position: "relative", zIndex: 1 }}>
                <Metadata data={metadata} />
              </Box>
            ) : null}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default LabelerLayout;
