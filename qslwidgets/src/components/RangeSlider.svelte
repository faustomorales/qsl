<script lang="ts">
  import "nouislider/dist/nouislider.css";
  import { onMount } from "svelte";
  import { create } from "nouislider";
  import type { API, target } from "nouislider";
  import type { RangeSliderMark } from "../library/types";
  import { focus } from "../library/common";
  export let name: string,
    value: number,
    min: number,
    max: number,
    step: number = 0.1,
    disabled: boolean | undefined,
    marks: RangeSliderMark[] = [];
  let slider: target, api: API;
  $: initializeSlider = () => {
    if (api) api.destroy();
    api = create(slider, {
      connect: false,
      range: {
        min,
        max,
      },
      step,
      pips: {
        mode: "values",
        filter: (value: number) =>
          (marks || []).some((m) => m.value === value) ? 1 : -1,
        format: {
          to: (value: number) => {
            const mark = marks.find((m) => m.value === value);
            return mark?.label || mark?.value.toString() || value.toString();
          },
        },
        values: (marks || []).map((m) => m.value),
        density: 1,
      },
      start: value,
    } as any);
    api.on("slide", (values) => (value = parseFloat(values[0] as any)));
    slider.querySelectorAll(".noUi-value").forEach((p) =>
      p.addEventListener("click", () => {
        value = parseFloat((p as any).dataset.value);
        focus(slider);
      })
    );
  };
  onMount(() => initializeSlider());
  $: if (
    api &&
    ((api.options.pips as any).values.length !== (marks || []).length ||
      !(api.options.pips as any).values.every(
        (v: number, i: number) => v == marks[i]?.value
      ) ||
      api.options.range.max !== max ||
      api.options.range.min !== min ||
      api.options.step !== step)
  )
    initializeSlider();
  $: if (api && api.get() !== value) api.set(value);
  $: if (slider) {
    disabled
      ? slider.setAttribute("disabled", "true")
      : slider.removeAttribute("disabled");
  }
</script>

<div class="range-slider-container">
  <div class="range-slider-label">{name}</div>
  <div bind:this={slider} class="range-slider" />
</div>

<style>
  .range-slider-container {
    height: 35px;
    display: flex;
    flex-direction: row;
    align-items: center;
    color: var(--label-color);
    font-size: 12pt;
    z-index: 1;
    position: relative;
  }
  .range-slider-container .range-slider-label {
    white-space: nowrap;
    padding-right: 10px;
  }
  .range-slider {
    height: 8px;
    flex-basis: 100%;
    background-color: var(--background-color);
  }

  .range-slider :global(.noUi-handle) {
    height: 12px;
    width: 12px;
    right: -6px;
    top: -3px;
    border-radius: 50%;
  }
  .range-slider:not([disabled="true"]) :global(.noUi-handle),
  .range-slider:not([disabled="true"]) :global(.noUi-base) {
    cursor: pointer;
  }
  .range-slider :global(.noUi-handle::before),
  .range-slider :global(.noUi-handle::after) {
    background: none;
  }
  .range-slider :global(.noUi-pips-horizontal) {
    height: 15px;
    padding: 0;
  }
  .range-slider :global(.noUi-marker-horizontal) {
    height: 5px;
    width: 1px;
    margin-left: -0.5px;
  }
  .range-slider :global(.noUi-value) {
    font-size: 8pt;
    padding-left: 5px;
    padding-right: 5px;
  }
  .range-slider:not([disabled="true"]) :global(.noUi-value) {
    cursor: pointer;
  }
</style>
