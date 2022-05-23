import React from "react";
import { Box, styled } from "@mui/material";
import {
  LineChart,
  XAxis,
  YAxis,
  Line,
  CartesianGrid,
  ReferenceArea,
  Legend,
  Dot,
} from "recharts";
import { TimeSeriesTarget, DraftLabels } from "./library/types";
import GlobalLabelerContext from "./GlobalLabelerContext";

const TimeSeriesContainer = styled(Box)`
  & .recharts-reference-area-rect {
    fill-opacity: 0.25;
  }
  & .recharts-reference-area.active .recharts-reference-area-rect:hover,
  .recharts-reference-area-rect:hover {
    fill: red;
  }
  & .recharts-reference-area.active .recharts-reference-area-rect {
    fill: blue;
  }

  & .recharts-dot {
    fill: white;
    stroke: var(--line-color);
  }

  & .recharts-dot.hoverable:hover,
  .recharts-dot.active {
    fill: var(--line-color);
  }

  & .recharts-dot.active:hover {
    fill: red;
    stroke: red;
  }

  & .recharts-text.recharts-label {
    text-anchor: middle;
  }
`;

const TimeSeries: React.FC<{
  target: TimeSeriesTarget;
  labels: DraftLabels;
  toggle?: (label: string, value: string) => void;
}> = ({ target, toggle, labels }) => {
  const { setFocus } = React.useContext(GlobalLabelerContext);
  const data = React.useMemo(
    () =>
      target.plots.map((p) =>
        p.x.values.map((x, xi) => {
          return {
            ...Object.fromEntries(p.y.lines.map((y) => [y.name, y.values[xi]])),
            [p.x.name]: x,
          };
        })
      ),
    [target]
  );
  return (
    <TimeSeriesContainer onClick={setFocus}>
      {target.plots.map((plot, ploti) => (
        <LineChart
          key={ploti}
          width={plot.size?.width || 512}
          height={plot.size?.height || 256}
          data={data[ploti]}
        >
          <XAxis
            height={plot.x.height || 60}
            dataKey={plot.x.name}
            type={plot.x.type || "number"}
            tickCount={plot.x.tickCount}
            label={plot.x.name}
          />
          <YAxis
            domain={plot.y.limits?.left}
            label={
              plot.y.labels?.left
                ? {
                    value: plot.y.labels?.left,
                    angle: -90,
                    position: "insideLeft",
                  }
                : undefined
            }
            width={plot.y.widths?.left || 60}
            yAxisId={"left"}
            orientation="left"
          />
          <YAxis
            domain={plot.y.limits?.right}
            label={
              plot.y.labels?.right
                ? {
                    value: plot.y.labels?.right,
                    angle: -90,
                    position: "insideRight",
                  }
                : undefined
            }
            width={plot.y.widths?.right || 60}
            yAxisId={"right"}
            orientation="right"
          />
          <Legend />
          <CartesianGrid />
          {(plot.areas || []).map((a, ai) => (
            <ReferenceArea
              yAxisId="left"
              label={a.label}
              key={ai}
              x1={a.x1}
              x2={a.x2}
              y1={a.y1}
              y2={a.y2}
              className={
                (labels.image && labels.image[a.labelKey]
                  ? labels.image[a.labelKey]
                  : []
                ).indexOf(a.labelVal) > -1
                  ? "active"
                  : undefined
              }
              onClick={() => {
                if (toggle) {
                  toggle(a.labelKey, a.labelVal);
                }
                setFocus();
              }}
            />
          ))}
          {plot.y.lines.map((y, yi) => (
            <Line
              key={yi}
              animationDuration={plot.y.animation || 1500}
              yAxisId={y.axis || "left"}
              type={y.type || "monotone"}
              dataKey={y.name}
              stroke={y.color}
              dot={
                y.dot
                  ? (args) => {
                      const xvalue = args.payload[plot.x.name];
                      const hoverable = labels.image && !!y.dot?.labelKey;
                      const active =
                        hoverable && labels.image[y.dot!.labelKey!]
                          ? (labels.image[y.dot!.labelKey!] || []).indexOf(
                              xvalue.toString()
                            ) > -1
                            ? true
                            : false
                          : false;
                      const props = {
                        key: args.key,
                        r: args.r,
                        cx: args.cx,
                        cy: args.cy,
                        strokeWidth: args.strokeWidth,
                        style: {
                          "--line-color": args.stroke,
                        } as React.CSSProperties,
                        className: active
                          ? "active"
                          : hoverable
                          ? "hoverable"
                          : undefined,
                        onClick:
                          y.dot?.labelKey && toggle
                            ? ((() =>
                                toggle(
                                  y.dot!.labelKey!,
                                  xvalue.toString()
                                )) as any)
                            : undefined,
                      };
                      return <Dot {...props} />;
                    }
                  : false
              }
            />
          ))}
        </LineChart>
      ))}
    </TimeSeriesContainer>
  );
};

export default TimeSeries;
