<svelte:options immutable={true} />

<script lang="ts">
  import type { Bitmap } from "../library/types.js";
  import { renderBitmapToCanvas } from "../library/common.js";
  export let bitmap: Bitmap, color: "red" | "blue" | "yellow";
  let canvas: HTMLCanvasElement;
  $: renderBitmapToCanvas(bitmap, canvas, color);
</script>

<canvas class="region mask" bind:this={canvas} />

<style>
  canvas {
    image-rendering: pixelated;
    width: 100%;
    height: 100%;
    top: 0;
  }
</style>
