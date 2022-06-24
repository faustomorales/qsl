<script lang="ts">
  import type {
    TimeSeriesTarget,
    Line,
    DraftLabels,
    AxisDomainDefinition,
  } from "./library/types";
  import { createEventDispatcher } from "svelte";
  export let target: TimeSeriesTarget, labels: DraftLabels;
  const defaults = {
    width: 512,
    height: 256,
    tickSpan: 50,
    tickSize: 8,
    fontSize: 20,
    axisSize: 80,
    dotRadius: 3,
    lineColor: "black",
  };
  const computeAxes = (lines: Line[], userSetting?: AxisDomainDefinition) => {
    const { dataMin, dataMax } = lines.reduce(
      (memo, line) => {
        return line.values.reduce((valueMemo, value) => {
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
    return {
      min:
        userSetting && userSetting[0] && userSetting[0] !== "dataMin"
          ? userSetting[0]
          : dataMin || 0,
      max:
        userSetting && userSetting[1] && userSetting[1] !== "dataMax"
          ? userSetting[1]
          : dataMax || 0,
    };
  };

  $: axes = target.plots.map((p) => {
    const limits = {
      x: {
        min: Math.min(...p.x.values),
        max: Math.max(...p.x.values),
      },
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
      width: p.size?.width || defaults.width,
      height: p.size?.height || defaults.height,
    };
    const yMargin = 8;

    const axisSizes = {
      x: p.x.height || defaults.axisSize,
      y: {
        left: p.y.widths?.left || defaults.axisSize,
        right: p.y.widths?.right || defaults.axisSize,
      },
    };
    const extents = {
      x: {
        min: axisSizes.y.left,
        max: size.width - axisSizes.y.right,
        span: size.width - (axisSizes.y.left + axisSizes.y.right),
      },
      y: {
        min: axisSizes.x,
        max: size.height - yMargin,
        span: size.height - axisSizes.x - yMargin,
      },
    };
    const tickCount = {
      x: Math.floor(extents.x.span / defaults.tickSpan),
      y: Math.floor(extents.y.span / defaults.tickSpan),
    };
    const tickConfig = {
      step: {
        y: {
          left: (limits.y.left.max - limits.y.left.min) / tickCount.y,
          right: (limits.y.right.max - limits.y.right.min) / tickCount.y,
        },
        x: (limits.x.max - limits.x.min) / tickCount.x,
      },
    };
    const ticks = {
      y: {
        left: Array.from(Array(tickCount.y).keys())
          .map((t) => {
            return {
              pos: extents.y.min + t * defaults.tickSpan,
              val: t * tickConfig.step.y.left + limits.y.left.min,
            };
          })
          .concat([{ pos: extents.y.max, val: limits.y.left.max }]),
        right: Array.from(Array(tickCount.y).keys())
          .map((t) => {
            return {
              pos: extents.y.min + t * defaults.tickSpan,
              val: limits.y.right.min + t * tickConfig.step.y.right,
            };
          })
          .concat([{ pos: extents.y.max, val: limits.y.right.max }]),
      },
      x: Array.from(Array(tickCount.x).keys())
        .map((t) => {
          return {
            pos: extents.x.min + t * defaults.tickSpan,
            val: t * tickConfig.step.x + limits.x.min,
          };
        })
        .concat([{ pos: extents.x.max, val: limits.x.max }]),
    };
    return {
      size,
      extents,
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
        ticks: ticks.y as { [key: string]: { pos: number; val: number }[] },
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
  const dispatcher = createEventDispatcher();
  const createDispatcher = (label: any, value: any) => () =>
    dispatcher("toggle", { label, value });
  $: lineGroups = target.plots
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
        const points = l.values.map((v, vi) => {
          const value = { x: p.x.values[vi], y: v };
          return {
            x:
              ((value.x - lims.x.min) / dataSpan.x) * a.extents.x.span +
              a.extents.x.min,
            y:
              a.size.height -
              (a.extents.y.min +
                ((value.y - lims.y.min) / dataSpan.y) * a.extents.y.span),
            data: value,
          };
        });
        const interactive = !!l.dot?.labelKey;
        const selected = interactive
          ? labels.image[l.dot!.labelKey!] || []
          : undefined;
        return {
          color: l.color || defaults.lineColor,
          points,
          interactive,
          dots: l.dot
            ? points.map((point) => {
                const xString = point.data.x.toString();
                return {
                  ...point,
                  active: selected ? selected.indexOf(xString) > -1 : false,
                  onClick: interactive
                    ? createDispatcher(l.dot!.labelKey, xString)
                    : undefined,
                };
              })
            : [],
        };
      })
    );
  $: areaGroups = target.plots
    .map((p, pi) => {
      return { p, a: axes[pi] };
    })
    .map(({ a, p }) => {
      const limitSpan = a.x.limits.max - a.x.limits.min;
      return (
        p.areas?.map((area) => {
          const selected = labels.image[area.labelKey] || [];
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
            active: selected.indexOf(area.labelVal) > -1,
            label: area.label,
            onClick: createDispatcher(area.labelKey, area.labelVal),
          };
        }) || []
      );
    });
</script>

<svg width={chartSize.width} height={chartSize.height} class="chart">
  {#each target.plots.map((p, pi) => {
    return { p, a: axes[pi], lines: lineGroups[pi], areas: areaGroups[pi] };
  }) as { a, lines, areas }, pi}
    <svg class="plot">
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
                (ti == 0 ? 0 : defaults.tickSize)}
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
              font-size={defaults.fontSize}
              >{parseFloat(t.val.toFixed(1)).toString()}</text
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
                    (ti == 0 && side.side == "right" ? 0 : defaults.tickSize)}
                  x2={side.x +
                    (ti == 0 && side.side == "left" ? 0 : defaults.tickSize)}
                  y1={a.size.height - t.pos}
                  y2={a.size.height - t.pos}
                />
                <text
                  x={side.x + side.sign * (1.25 * defaults.tickSize)}
                  y={a.size.height - t.pos + defaults.fontSize / 3}
                  font-size={defaults.fontSize}
                  >{parseFloat(t.val.toFixed(1)).toString()}</text
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
        viewBox="{a.extents.x.min} {a.size.height - a.extents.y.max} {a.extents
          .x.span} {a.extents.y.span}"
      >
        {#each areas as area}
          <g class="reference-area">
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
            <defs>
              <mask id="dot-mask" class="mask">
                <rect
                  x={a.extents.x.min}
                  y={a.size.height - a.extents.y.max}
                  width={a.extents.x.span}
                  height={a.extents.y.span}
                />
                {#each line.dots as dot}
                  <circle cx={dot.x} cy={dot.y} r={defaults.dotRadius} />
                {/each}
              </mask>
            </defs>
            <g class="dots {line.interactive ? 'interactive' : ''}">
              {#each line.dots as dot}
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  class={dot.active ? "active" : ""}
                  r={defaults.dotRadius}
                  on:click={dot.onClick}
                />
              {/each}
            </g>
            <polyline
              mask="url(#dot-mask)"
              points={line.points
                .map((point) => `${point.x} ${point.y}`)
                .join(" ")}
            />
          </g>
        {/each}
      </svg>
    </svg>
  {/each}
</svg>

<style>
  line,
  polyline {
    stroke-width: calc(1px / var(--media-viewer-scale, 1));
    stroke: black;
  }
  .line polyline,
  .line circle {
    stroke: var(--line-color);
    fill: none;
  }
  .line .dots.interactive circle:hover,
  .line .dots.interactive circle.active {
    fill: var(--line-color);
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
    fill: gray;
  }
  .reference-area rect.active {
    fill: blue;
  }
  .reference-area rect:hover,
  .reference-area rect.active:hover {
    fill: red;
  }
  .mask rect {
    fill: white;
  }
  .mask circle {
    fill: black;
  }
  .tick text {
    font-size: 10pt;
  }
  .label text {
    font-size: 12pt;
  }
  text {
    font-family: Roboto, Helvetica, Arial, sans-serif;
  }
</style>
