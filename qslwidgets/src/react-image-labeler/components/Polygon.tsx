import React from "react";
import { pct2css, labels2string, epsilon } from "./library/utils";
import { Point, LabelData } from "./library/types";

const interpretPoints = (raw: Point[], cursor?: Point) => {
  const points = cursor ? raw.concat([cursor]) : raw;
  const [xmin, ymin, xmax, ymax] = [Math.min, Math.max]
    .map((agg) =>
      ["x", "y"].map((k) =>
        agg.apply(Math, points.map((p) => p[k as "x" | "y"]) as number[])
      )
    )
    .flat() as number[];
  return { points, xmin, ymin, xmax, ymax };
};

interface PolygonLabel {
  points: Point[];
  labels: LabelData;
}

type PolygonProps = {
  polygon: PolygonLabel;
  color: string;
  candidate?: Point;
} & React.ComponentProps<"svg"> &
  React.ComponentProps<"text">;

const STROKE_WIDTH = 2;

const Polygon: React.FC<PolygonProps> = ({
  polygon,
  color,
  candidate,
  ...childProps
}) => {
  const { points, xmin, ymin, xmax, ymax } = interpretPoints(
    polygon.points,
    candidate
  );
  const width = Math.max(xmax - xmin, epsilon);
  const height = Math.max(ymax - ymin, epsilon);
  return (
    <svg
      className="region polygon"
      width={pct2css(width)}
      height={pct2css(height)}
      {...childProps}
      style={{
        position: "absolute",
        left: pct2css(xmin),
        top: pct2css(ymin),
        overflow: "visible",
        ...(childProps.style || {}),
      }}
    >
      <text
        fill={color}
        {...childProps}
        className="box-text"
        alignmentBaseline="hanging"
        onClick={childProps.onClick}
      >
        {labels2string(polygon.labels)}
      </text>
      <svg {...childProps}>
        {Array.from(Array(points.length - 1).keys()).map((index) => {
          return (
            <line
              key={index}
              stroke={color}
              strokeWidth={`calc(${STROKE_WIDTH}px / var(--media-viewer-scale, 1))`}
              x1={pct2css((points[index].x - xmin) / width)}
              y1={pct2css((points[index].y - ymin) / height)}
              x2={pct2css((points[index + 1].x - xmin) / width)}
              y2={pct2css((points[index + 1].y - ymin) / height)}
            />
          );
        })}
      </svg>
    </svg>
  );
};

export default Polygon;
