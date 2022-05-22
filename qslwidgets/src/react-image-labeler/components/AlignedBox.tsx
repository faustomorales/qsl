import React from "react";
import { pct2css, labels2string, epsilon } from "./library/utils";
import { AlignedBoxLabel, Point } from "./library/types";

type AlignedBoxProps = {
  box: AlignedBoxLabel;
  color: string;
  candidate?: Point;
} & React.ComponentProps<"svg"> &
  React.ComponentProps<"text"> &
  React.ComponentProps<"rect">;

const STROKE_WIDTH = 2;

const AlignedBox: React.FC<AlignedBoxProps> = ({
  box,
  color,
  candidate,
  ...childProps
}) => {
  const pt1 = box.pt1;
  const pt2 = box.pt2 || candidate;
  if (!pt2) {
    return null;
  }
  const [xmin, ymin, xmax, ymax] = [Math.min, Math.max]
    .map((agg) =>
      ["x", "y"].map((k) =>
        agg.apply(Math, [pt1, pt2].map((p) => p[k as "x" | "y"]) as number[])
      )
    )
    .flat() as number[];
  const width = Math.max(xmax - xmin, epsilon);
  const height = Math.max(ymax - ymin, epsilon);
  return (
    <svg
      className="region box"
      width={pct2css(width)}
      height={pct2css(height)}
      {...childProps}
      style={{
        position: "absolute",
        left: pct2css(xmin),
        top: pct2css(ymin),
        height: pct2css(height),
        overflow: "visible",
        ...(childProps.style || {}),
      }}
    >
      <text
        fill={color}
        className="box-text"
        x={5}
        y={5}
        z={0}
        fontSize="8pt"
        fontFamily="Roboto,Helvetica,Arial,sans-serif"
        dominantBaseline="hanging"
        onClick={childProps.onClick}
      >
        {labels2string(box.labels)}
      </text>
      <rect
        {...childProps}
        x={0}
        y={0}
        fill="none"
        width="100%"
        strokeWidth={`calc(${STROKE_WIDTH}px / var(--media-viewer-scale, 1))`}
        height="100%"
        stroke={color}
        z={1}
      />
    </svg>
  );
};

export default AlignedBox;
