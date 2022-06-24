import React from "react";
import { RangeSliderMark } from "./library/types";
import RangeSliderSvelte from "./RangeSlider.svelte";
import toReact from "./library/adapter";

const RangeSliderAdapted = toReact(RangeSliderSvelte);

const RangeSlider: React.FC<{
  name: string;
  value: number;
  min: number;
  max: number;
  width?: number | string;
  disabled?: boolean;
  onValueChange: (value: number) => void;
  step?: number;
  marks?: RangeSliderMark[];
}> = ({ name, value, onValueChange, min, max, step, disabled, marks }) => (
  <RangeSliderAdapted
    name={name}
    value={value}
    min={min}
    max={max}
    disabled={disabled}
    step={step}
    marks={marks}
    onChange={(event: any) => onValueChange(event.detail.value)}
  />
);

export default RangeSlider;
