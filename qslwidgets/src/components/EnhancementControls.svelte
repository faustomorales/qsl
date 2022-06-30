<script lang="ts">
  import RangeSlider from "./RangeSlider.svelte";
  import { enhancements } from "../library/stores";
</script>

<div class="controls-container">
  <RangeSlider
    name="Brightness"
    min={0}
    max={10}
    bind:value={$enhancements.brightness}
    marks={[{ value: 1 }]}
    disabled={false}
  />
  <RangeSlider
    name="Saturation"
    min={0}
    max={10}
    bind:value={$enhancements.saturation}
    marks={[{ value: 1 }]}
    disabled={false}
  />
  <RangeSlider
    name="Contrast"
    min={0}
    max={10}
    bind:value={$enhancements.contrast}
    marks={[{ value: 1 }]}
    disabled={false}
  />
  <slot />
</div>

<style>
  .controls-container {
    display: flex;
    flex-direction: row;
    column-gap: 10px;
  }

  :global(.controls-container > *) {
    flex-basis: 100%;
  }

  @media (max-width: 640px) {
    .controls-container {
      grid-template-columns: 1fr;
    }
  }
</style>
