<script lang="ts">
  import type { Point, PolygonLabel } from "../library/types.js";
  import { pct2css, labels2string, epsilon } from "../library/common.js";
  import { simplify } from "../library/geometry.js";
  export let polygon: PolygonLabel,
    color: string,
    candidate: Point | undefined = undefined;
  $: ({ points, xmin, ymin, xmax, ymax } = simplify(polygon.points, candidate));
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
  style="
    left: {html.left};
    top: {html.top};
  "
  on:click
  on:mousemove
>
  <text on:click fill={color} alignment-baseline="hanging">
    {html.labels}
  </text>
  {#each html.lines as line}
    <line stroke={color} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
  {/each}
</svg>
