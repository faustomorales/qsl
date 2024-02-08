<script lang="ts">
  import type {
    TimeSeriesTarget,
    Line,
    Dimensions,
    DraftLabels,
    Config,
    AxisDomainDefinition,
  } from "../library/types";
  import { processSelectionChange, focus } from "../library/common";
  import Chart from "./icons/Chart.svelte";
  export let target: TimeSeriesTarget | undefined,
    config: Config,
    labels: DraftLabels,
    defaultWidth: undefined | number = undefined,
    chartSize: Dimensions | undefined = undefined;
  const defaults = {
    width: 512,
    height: 256,
    tickSpan: 50,
    tickSize: 8,
    fontSize: 20,
    yAxisSize: 80,
    xAxisSize: 60,
    dotRadius: 3,
    legendSize: 35,
    areaInactiveColor: "gray",
    areaHoverColor: "red",
    areaActiveColor: "blue",
    lineStyle: "",
    yMargin: 8,
    lineColor: "var(--text-color)",
  };
  let container: HTMLDivElement;
  const debug = false;
  const computeTicks = (
    tickSpan: number,
    config: {
      pos: { min: number; max: number };
      val: { min: number; max: number };
    },
    precision?: number
  ) => {
    const n = Math.floor((config.pos.max - config.pos.min) / tickSpan);
    const valStep = (config.val.max - config.val.min) / n;
    return Array.from(Array(n).keys())
      .map((t: number) => {
        let val = config.val.min + t * valStep;
        return {
          val,
          pos: config.pos.min + t * tickSpan,
        };
      })
      .concat([{ pos: config.pos.max, val: config.val.max }])
      .map((t) => ({
        ...t,
        txt: parseFloat(t.val.toFixed(precision || 1)).toString(),
      }));
  };
  const computeAxes = (lines: Line[], userSetting?: AxisDomainDefinition) => {
    const { dataMin, dataMax } = lines.reduce(
      (memo, line) => {
        return line.values.reduce((valueMemo, value) => {
          if (typeof value === "string") {
            return valueMemo;
          }
          const current = {
            dataMin: Math.min(
              valueMemo.dataMin === undefined ? value : valueMemo.dataMin,
              value
            ),
            dataMax: Math.max(
              valueMemo.dataMax === undefined ? value : valueMemo.dataMax,
              value
            ),
          };
          return current;
        }, memo);
      },
      {
        dataMin: undefined as number | undefined,
        dataMax: undefined as number | undefined,
      }
    );
    // The typeof check accounts for both "dataMin" / "dataMax" as well
    // as nan / NaN.
    return {
      min:
        userSetting && userSetting[0] && typeof userSetting[0] !== "string"
          ? userSetting[0]
          : dataMin || 0,
      max:
        userSetting && userSetting[1] && typeof userSetting[1] !== "string"
          ? userSetting[1]
          : dataMax || 0,
    };
  };

  $: axes = !target
    ? []
    : target.plots.map((p) => {
        const limits = {
          x: computeAxes([{ values: p.x.values, name: p.x.name }], p.x.limits),
          y: {
            left: computeAxes(
              p.y.lines.filter((line) => (line.axis || "left") == "left"),
              p.y.limits?.left
            ),
            right: computeAxes(
              p.y.lines.filter((line) => (line.axis || "left") == "right"),
              p.y.limits?.right
            ),
          } as { [key: string]: { min: number; max: number } },
        };
        const size = {
          width: p.size?.width || defaultWidth || defaults.width,
          height: p.size?.height || defaults.height,
        };
        const axisSizes = {
          x: p.x.height || defaults.xAxisSize,
          y: {
            left: p.y.widths?.left || defaults.yAxisSize,
            right: p.y.widths?.right || defaults.yAxisSize,
          },
        };
        const extents = {
          x: {
            min: axisSizes.y.left,
            max: size.width - axisSizes.y.right,
            span: size.width - (axisSizes.y.left + axisSizes.y.right),
          },
          y: {
            min: axisSizes.x + defaults.legendSize,
            max: size.height - defaults.yMargin,
            span:
              size.height -
              (axisSizes.x + defaults.yMargin + defaults.legendSize),
          },
        };
        const ticks = {
          y: {
            left: computeTicks(
              defaults.tickSpan,
              {
                pos: extents.y,
                val: limits.y.left,
              },
              p.y.precision?.left
            ),
            right: computeTicks(
              defaults.tickSpan,
              {
                pos: extents.y,
                val: limits.y.right,
              },
              p.y.precision?.right
            ),
          },
          x: computeTicks(
            defaults.tickSpan,
            {
              pos: extents.x,
              val: limits.x,
            },
            p.x.precision
          ),
        };
        return {
          size,
          extents,
          axisSizes,
          x: {
            limits: limits.x,
            ticks: ticks.x,
            label: p.x.name,
          },
          y: {
            limits: limits.y,
            labels: {
              left: p.y.labels?.left || "",
              right: p.y.labels?.right || "",
            } as { [key: string]: string },
            ticks: ticks.y as {
              [key: string]: { pos: number; val: number; txt: string }[];
            },
          },
        };
      });
  $: chartSize = axes.reduce(
    (memo, axis) => {
      return {
        width: Math.max(axis.size.width, memo.width),
        height: axis.size.height + memo.height,
      };
    },
    { width: 0, height: 0 }
  );
  const toggle = (label: any, value: any, maxCount?: number) => {
    const labelConfig = config.image?.find((c) => c.name === label);
    if (labelConfig) {
      labels = {
        ...labels,
        image: {
          ...labels.image,
          [label]: processSelectionChange(
            value,
            labels["image"][label],
            labelConfig.multiple,
            labelConfig.required
          ).slice(maxCount ? -maxCount : undefined),
        },
      };
    }
    if (container) {
      focus(container);
    }
  };
  $: lineGroups = !target
    ? []
    : target.plots
        .map((p, pi) => {
          return { p, a: axes[pi] };
        })
        .map(({ p, a }) =>
          p.y.lines.map((l) => {
            const lims = {
              x: a.x.limits,
              y: a.y.limits[l.axis || "left"],
            };
            const dataSpan = {
              x: lims.x.max - lims.x.min,
              y: lims.y.max - lims.y.min,
            };
            const points = l.values
              .map((v, vi) => {
                const value = { x: p.x.values[vi], y: v };
                return {
                  x:
                    ((value.x - lims.x.min) / dataSpan.x) * a.extents.x.span +
                    a.extents.x.min,
                  y:
                    typeof value.y === "number"
                      ? a.size.height -
                        (a.extents.y.min +
                          ((value.y - lims.y.min) / dataSpan.y) *
                            a.extents.y.span)
                      : null,
                  data: value,
                };
              })
              .filter((p) => p.y !== null);
            const interactive = !!l.dot?.labelKey;
            const selected = interactive
              ? labels.image[l.dot!.labelKey!]?.map(parseFloat) || []
              : undefined;
            const annotations = (l.annotations || [])
              .map((a) => {
                const idx = p.x.values.indexOf(a.x);
                return idx > -1
                  ? {
                      ...a,
                      ...points[idx],
                      radius: a.radius || l.dot?.radius || defaults.dotRadius,
                      style: a.style || "",
                    }
                  : null;
              })
              .filter((v) => v !== null) as {
              x: number;
              y: number;
              radius: number;
              style: string;
            }[];
            return {
              color: l.color || defaults.lineColor,
              points,
              style: l.style || defaults.lineStyle,
              name: l.name,
              dotRadius: l.dot?.radius || defaults.dotRadius,
              interactive,
              annotations,
              dots: l.dot
                ? points.map((point) => {
                    return {
                      ...point,
                      active: selected
                        ? selected.indexOf(point.data.x) > -1
                        : false,
                      onClick: interactive
                        ? () =>
                            toggle(
                              l.dot!.labelKey,
                              point.data.x.toString(),
                              l.dot!.labelMaxCount
                            )
                        : undefined,
                    };
                  })
                : [],
            };
          })
        );
  $: areaGroups = !target
    ? []
    : target.plots
        .map((p, pi) => {
          return { p, a: axes[pi] };
        })
        .map(({ a, p }) => {
          const limitSpan = a.x.limits.max - a.x.limits.min;
          return (
            p.areas?.map((area) => {
              const selected = area.labelKey ? (labels.image[area.labelKey] || []) : [];
              return {
                x1:
                  a.extents.x.min +
                  ((area.x1 - a.x.limits.min) / limitSpan) * a.extents.x.span,
                x2:
                  a.extents.x.min +
                  ((area.x2 - a.x.limits.min) / limitSpan) * a.extents.x.span,
                y1: a.extents.y.min,
                y2: a.extents.y.max,
                strokeDashArray: area.strokeDashArray || "4",
                stroke: area.stroke || "black",
                active: area.labelKey ? selected.indexOf(area.labelVal) > -1 : false,
                label: area.label,
                inactiveColor: area.inactiveColor || defaults.areaInactiveColor,
                activeColor: area.activeColor || defaults.areaActiveColor,
                hoverColor: area.hoverColor || defaults.areaHoverColor,
                interactive: !!area.labelKey,
                onClick: area.labelKey ? () => toggle(area.labelKey, area.labelVal) : null,
              };
            }) || []
          );
        });
</script>
<div
  style="width: {chartSize?.width}px; height: {chartSize?.height}px;"
  class="chart"
  bind:this={container}
>
  {#each (target || { plots: [] }).plots.map((p, pi) => {
    return { p, a: axes[pi], lines: lineGroups[pi], areas: areaGroups[pi] };
  }) as { a, lines, areas }}
    <div style="width: {a.size.width}px; height: {a.size.height}px;">
      <svg
        class="plot"
        width={a.size.width}
        height={a.size.height - defaults.legendSize}
      >
        {#if debug}
          <rect
            x={a.extents.x.min}
            y={a.size.height - a.extents.y.max}
            width={a.extents.x.span}
            height={a.extents.y.span}
            fill="red"
          />
          <rect
            x={a.extents.x.min}
            y={a.size.height - defaults.legendSize - a.axisSizes.x}
            width={a.extents.x.span}
            height={a.axisSizes.x}
            fill="blue"
          />
          <rect
            x={0}
            y={a.size.height - a.extents.y.max}
            width={a.axisSizes.y.left}
            height={a.extents.y.span}
            fill="blue"
          />
          <rect
            x={a.axisSizes.y.left + a.extents.x.span}
            y={a.size.height - a.extents.y.max}
            width={a.axisSizes.y.right}
            height={a.extents.y.span}
            fill="blue"
          />
        {/if}
        <g class="axis x">
          <line
            class="bottom"
            x1={a.extents.x.min}
            x2={a.extents.x.max}
            y1={a.size.height - a.extents.y.min}
            y2={a.size.height - a.extents.y.min}
          />
          <line
            class="top"
            x1={a.extents.x.min}
            x2={a.extents.x.max}
            y1={a.size.height - a.extents.y.max}
            y2={a.size.height - a.extents.y.max}
          />
          <g class="label">
            <text
              font-size={defaults.fontSize}
              x={a.extents.x.min + a.extents.x.span / 2}
              y={a.size.height -
                a.extents.y.min +
                defaults.tickSize +
                defaults.fontSize * 2}>{a.x.label}</text
            >
          </g>
          {#each a.x.ticks as t, ti}
            <g class="tick x">
              <line
                y1={a.size.height -
                  a.extents.y.min -
                  (ti == 0 || ti == a.x.ticks.length - 1
                    ? 0
                    : defaults.tickSize)}
                y2={a.size.height - a.extents.y.min + defaults.tickSize}
                x1={t.pos}
                x2={t.pos}
              />
              <text
                x={t.pos}
                y={a.size.height -
                  a.extents.y.min +
                  defaults.tickSize +
                  defaults.fontSize}
                font-size={defaults.fontSize}>{t.txt}</text
              >
            </g>
          {/each}
        </g>
        {#each ["left", "right"].map((side) => {
          return { limits: a.y.limits[side], sign: side == "left" ? -1 : 1, x: side === "left" ? a.extents.x.min : a.extents.x.max, ticks: a.y.ticks[side], side: side, label: a.y.labels[side] };
        }) as side}
          <g class="axis y {side.side}">
            <line
              x1={side.x}
              x2={side.x}
              y1={a.size.height - a.extents.y.max}
              y2={a.size.height - a.extents.y.min}
            />
            <text
              class="label"
              x={side.x +
                side.sign * (defaults.tickSize + 3.0 * defaults.fontSize)}
              y={a.size.height - (a.extents.y.min + a.extents.y.span / 2)}
              font-size={defaults.fontSize}>{side.label}</text
            >
            {#if side.limits.max != 0 || side.limits.min != 0}
              {#each side.ticks as t, ti}
                <g class="tick y {side.side}">
                  <line
                    x1={side.x -
                      ((ti == 0 || ti == side.ticks.length - 1) &&
                      side.side == "right"
                        ? 0
                        : defaults.tickSize)}
                    x2={side.x +
                      ((ti == 0 || ti == side.ticks.length - 1) &&
                      side.side == "left"
                        ? 0
                        : defaults.tickSize)}
                    y1={a.size.height - t.pos}
                    y2={a.size.height - t.pos}
                  />
                  <text
                    x={side.x + side.sign * (1.25 * defaults.tickSize)}
                    y={a.size.height - t.pos + defaults.fontSize / 4}
                    font-size={defaults.fontSize}>{t.txt}</text
                  >
                </g>
              {/each}
            {/if}
          </g>
        {/each}
        <svg
          class="chart-area"
          width={a.extents.x.span}
          height={a.extents.y.span}
          x={a.extents.x.min}
          y={a.size.height - a.extents.y.max}
          viewBox="{a.extents.x.min} {a.size.height - a.extents.y.max} {a
            .extents.x.span} {a.extents.y.span}"
        >
          {#each areas as area}
            <g class="reference-area {area.interactive ? 'interactive' : ''}" style="--area-inactive-color: {area.inactiveColor}; --area-active-color: {area.activeColor}; --area-hover-color: {area.hoverColor}">
              <rect
                x={area.x1}
                y={a.size.height - area.y2}
                width={area.x2 - area.x1}
                height={area.y2 - area.y1}
                on:click={area.onClick}
                class={area.active ? "active" : ""}
                style="stroke: {area.stroke}; stroke-dasharray: {area.strokeDashArray}"
              />
              {#if area.label}
                <text
                  x={(area.x1 + area.x2) / 2}
                  font-size={defaults.fontSize}
                  y={a.size.height - (area.y2 + area.y1) / 2}>{area.label}</text
                >
              {/if}
            </g>
          {/each}
          {#each lines as line}
            <g class="line" style="--line-color: {line.color}">
              <polyline
                style={line.style}
                points={line.points
                  .map((point) => `${point.x} ${point.y}`)
                  .join(" ")}
              />
              <g class="dots {line.interactive ? 'interactive' : ''}">
                {#each line.annotations as annotation}
                  <circle
                    cx={annotation.x}
                    cy={annotation.y}
                    class="active"
                    style={annotation.style}
                    r={annotation.radius}
                  />
                {/each}
                {#each line.dots as dot}
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    class={dot.active ? "active" : ""}
                    r={line.dotRadius}
                    on:click={dot.onClick}
                  />
                {/each}
              </g>
            </g>
          {/each}
        </svg>
      </svg>
      <div
        class="legend"
        style="width: {a.size.width}px; height: {defaults.legendSize}px"
      >
        {#if lines.length > 1}
          {#each lines as line}
            <div class="legend-entry" style="--line-color: {line.color}">
              <Chart />
              <span class="label">{line.name}</span>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  line,
  polyline {
    stroke-width: calc(1px / var(--media-viewer-scale, 1));
    stroke: var(--text-color);
  }
  text {
    color: var(--text-color);
    fill: var(--text-color);
  }
  .line polyline {
    fill: none;
    stroke: var(--line-color);
  }
  .line circle {
    fill: var(--line-color);
    fill-opacity: 0;
  }
  .line .dots.interactive circle:hover,
  .line .dots circle.active {
    fill-opacity: 100;
    fill: var(--line-color);
    stroke: var(--line-color);
  }
  .axis.x .tick text,
  .axis.x .label text {
    text-anchor: middle;
  }
  .axis.y.left .tick text {
    text-anchor: end;
  }
  .axis.y.right .tick text {
    text-anchor: start;
  }
  .axis.y .label {
    text-anchor: middle;
    writing-mode: vertical-lr;
  }
  .reference-area text {
    text-anchor: middle;
  }
  .reference-area rect {
    fill-opacity: 0.25;
    fill: var(--area-inactive-color)
  }
  .reference-area.interactive rect.active {
    fill: var(--area-active-color)
  }
  .reference-area.interactive rect:hover,
  .reference-area.interactive rect.active:hover {
    fill: var(--area-hover-color);
  }
  .tick text {
    font-size: 10pt;
  }
  .label text {
    font-size: 12pt;
  }
  .legend {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    column-gap: 10px;
  }
  .legend-entry {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: 10px;
  }
  .legend-entry .label {
    color: var(--line-color);
  }
  .legend-entry :global(svg) {
    width: 24px;
    fill: var(--line-color);
  }
</style>
