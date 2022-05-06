import { Box, Typography, LinearProgress } from "@mui/material";
import React from "react";

// A simple progress bar inspired by https://github.com/abdennour/react-progressbar
const ProgressBar: React.FC<{
  progress: number;
}> = (props) => {
  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Box sx={{ width: "100%", mr: 1 }}>
        <LinearProgress variant="determinate" value={props.progress} />
      </Box>
      <Box sx={{ minWidth: 20, textAlign: "right" }}>
        <Typography variant="body2" color="text.secondary">{`${Math.round(
          props.progress
        )}%`}</Typography>
      </Box>
    </Box>
  );
};

export default ProgressBar;
