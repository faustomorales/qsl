import React from "react";
import { Stack, Slider, Typography } from "@mui/material";

const RangeSlider: React.FC<
  {
    name: string;
    value: number;
    min: number;
    max: number;
    width?: number | string;
    disabled?: boolean;
    onValueChange: (value: number) => void;
  } & React.ComponentProps<typeof Slider>
> = ({ name, value, onValueChange, min, max, width, disabled, ...other }) => (
  <Stack
    direction="row"
    alignItems="center"
    spacing={2}
    style={width ? { width: width } : {}}
  >
    <Typography fontSize="small">{name}</Typography>
    <Slider
      {...other}
      size="small"
      value={value}
      style={width ? { width: width } : {}}
      min={min}
      classes={{ thumb: "slider-thumb" }}
      max={max}
      disabled={disabled}
      valueLabelDisplay={"on"}
      valueLabelFormat={Math.round}
      onChange={(event, value) => onValueChange(value as number)}
    />
  </Stack>
);

export default RangeSlider;
