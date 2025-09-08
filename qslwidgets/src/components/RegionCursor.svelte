<script lang="ts">
  import { pct2css } from "../library/common.js";
  const borderThickness = 2;
  export let x: number, y: number, radius: number;
</script>

<div
  class="mask-cursor"
  style="
    height: {radius * 2}px;
    width: {radius * 2}px;
    border: {borderThickness}px solid red;
    transform: translate({-radius - borderThickness}px, {-radius -
    borderThickness}px) scale(calc(1/var(--media-viewer-scale, 1)));
    left: {pct2css(x)};
    top: {pct2css(y)};
  "
/>

<style>
  div {
    position: absolute;
    box-sizing: content-box;
    cursor: none;
    overflow: visible;
    pointer-events: none;
    z-index: 1;
  }
</style>
