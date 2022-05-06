import React from "react";
import { Stack, Slider, Typography, Box } from "@mui/material";
import { pct2css } from "./library/utils";

const formatTime = (t?: number): string => {
  if (t === undefined || isNaN(t)) {
    return "00:00";
  }
  const minutes = Math.floor(t / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.round(t % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const Playbar: React.FC<{
  timestamp: number;
  duration?: number;
  setTimestamp: (timestamp: number) => void;
  setSecondary: (timestamp: number) => void;
  marks: number[];
  secondary?: number;
  secondaryThumbnail?: React.ReactNode;
}> = ({
  timestamp,
  secondary,
  duration,
  marks,
  setTimestamp,
  setSecondary,
  secondaryThumbnail,
}) => {
  return (
    <Box sx={{ width: "100%" }} className="playbar">
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography fontSize="small">
          {formatTime(timestamp)}/{formatTime(duration)}
        </Typography>
        <Box
          style={{ width: "100%", display: "inherit", position: "relative" }}
        >
          {secondary !== undefined && duration !== undefined ? (
            <Box
              style={{
                position: "absolute",
                maxWidth: 100,
                maxHeight: 100,
                left: pct2css(secondary / duration),
                bottom: "60%",
              }}
            >
              {secondaryThumbnail}
            </Box>
          ) : null}
          <Slider
            size="small"
            min={0}
            step={0.01}
            classes={{ thumb: "slider-thumb" }}
            componentsProps={{
              markLabel: {
                onClick: (event) => {
                  const dataIndex =
                    event.currentTarget.getAttribute("data-index");
                  if (!dataIndex) {
                    return;
                  }
                  setTimestamp(marks[parseInt(dataIndex)]);
                },
              },
            }}
            max={duration || 10}
            valueLabelDisplay="auto"
            marks={marks.map((value) => {
              return { value, label: value };
            })}
            value={[timestamp].concat(
              secondary !== undefined ? [secondary] : []
            )}
            onChange={(
              event: Event,
              value: number[] | number,
              activeThumb: number
            ) => {
              const valueArr = value as number[];
              const altKey = (event as MouseEvent).altKey;
              if (
                altKey &&
                (valueArr.length == 1 ||
                  valueArr[activeThumb] >= valueArr[1 - activeThumb])
              ) {
                setSecondary(valueArr[activeThumb]);
              } else if (!altKey) {
                setTimestamp(valueArr[activeThumb]);
              }
            }}
          />
        </Box>
      </Stack>
    </Box>
  );
};

export default Playbar;
