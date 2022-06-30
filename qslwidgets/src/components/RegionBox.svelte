<script lang="ts">
  import { pct2css, labels2string, epsilon } from "../library/common";
  import type { AlignedBoxLabel, Point } from "../library/types";
  export let box: AlignedBoxLabel,
    color: string,
    candidate: Point | undefined = undefined;
  $: pt1 = box.pt1;
  $: pt2 = box.pt2 || candidate;
  $: [xmin, ymin, xmax, ymax] =
    pt1 !== undefined && pt2 !== undefined
      ? ([Math.min, Math.max]
          .map((agg) =>
            ["x", "y"].map((k) =>
              agg.apply(
                Math,
                [pt1, pt2].map((p) => (p as Point)[k as "x" | "y"]) as number[]
              )
            )
          )
          .flat() as number[])
      : [pt1.x, pt1.y, pt1.x + epsilon, pt1.y + epsilon];
  $: html = {
    left: pct2css(xmin),
    top: pct2css(ymin),
    height: pct2css(Math.max(ymax - ymin, epsilon)),
    width: pct2css(Math.max(xmax - xmin, epsilon)),
    labels: labels2string(box.labels),
  };
</script>

<svg
  on:click
  on:mousemove
  class="region box"
  width={html.width}
  height={html.height}
  style="
    left: {html.left};
    top: {html.top};
    height: {html.height};
  "
>
  <text on:click fill={color} z={0} dominant-baseline="hanging">
    {html.labels}
  </text>
  <rect
    on:click
    fill="none"
    x="0"
    y="0"
    width="100%"
    height="100%"
    stroke={color}
    z={1}
  />
</svg>
