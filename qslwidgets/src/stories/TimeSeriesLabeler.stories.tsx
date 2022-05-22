import React from "react";
import { Labeler } from "../react-image-labeler";
import TimeSeriesLabeler from "../react-image-labeler/TimeSeriesLabeler";

export const BasicUsage: React.FC = () => {
  const labels = {
    image: { kind: ["foo"] },
  };
  const base = Array(100)
    .fill(0)
    .map((v, i) => i);
  return (
    <Labeler>
      <TimeSeriesLabeler
        config={{
          image: [
            { name: "kind", freeform: true, multiple: false },
            { name: "uvs", freeform: true, multiple: true },
          ],
        }}
        target={{
          plots: [
            {
              x: { name: "name", values: base.map((i) => i) },
              y: {
                animation: 100,
                labels: {
                  left: "uv",
                  right: "pv",
                },
                lines: [
                  {
                    name: "uv",
                    axis: "left",
                    color: "blue",
                    values: base.map((i) => i * 2 + 3),
                    dot: {
                      labelKey: "uvs",
                    },
                  },
                  {
                    name: "pv",
                    axis: "right",
                    color: "green",
                    values: base.map((i) => i * 3 + 1),
                  },
                ],
              },
              size: {
                width: 1024,
                height: 512,
              },
              areas: [
                {
                  x1: 2.1,
                  x2: 3.5,
                  label: "hello!",
                  labelKey: "kind",
                  labelVal: "foo",
                },
              ],
            },
          ],
        }}
        labels={labels}
      />
    </Labeler>
  );
};

export default {
  title: "TimeSeriesLabeler",
};
