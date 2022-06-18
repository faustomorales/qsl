<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import {
    pct2css,
    labels2string,
    epsilon,
    interpretPolygonPoints,
  } from "./library/utils";
  import type { Point, PolygonLabel } from "./library/types";
  export let polygon: PolygonLabel, color: string, candidate: Point | undefined;
  const dispatch = createEventDispatcher();
  $: ({ points, xmin, ymin, xmax, ymax } = interpretPolygonPoints(
    polygon.points,
    candidate
  ));
  $: width = Math.max(xmax - xmin, epsilon);
  $: height = Math.max(ymax - ymin, epsilon);
  $: html = {
    left: pct2css(xmin),
    top: pct2css(ymin),
    width: pct2css(width),
    height: pct2css(height),
    labels: labels2string(polygon.labels),
    lines: Array.from(Array(points.length - 1).keys()).map((index) => {
      return {
        x1: pct2css((points[index].x - xmin) / width),
        y1: pct2css((points[index].y - ymin) / height),
        x2: pct2css((points[index + 1].x - xmin) / width),
        y2: pct2css((points[index + 1].y - ymin) / height),
      };
    }),
  };
</script>

<svg
  class="region polygon"
  width={html.width}
  height={html.height}
  on:click={(nativeEvent) => dispatch("click", { nativeEvent })}
  on:mousemove={(nativeEvent) => dispatch("mouseMove", { nativeEvent })}
  style="
    left: {html.left};
    top: {html.top};
  "
>
  <text fill={color} alignment-baseline="hanging">
    {html.labels}
  </text>
  {#each html.lines as line}
    <line stroke={color} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
  {/each}
</svg>

<style>
  .region {
    position: absolute;
    overflow: visible;
  }

  .region line {
    stroke-width: calc(2px / var(--media-viewer-scale, 1));
  }
</style>
