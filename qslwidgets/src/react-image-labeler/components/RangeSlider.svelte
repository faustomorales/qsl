<script lang="ts">
  import "nouislider/dist/nouislider.css";
  import { onMount, createEventDispatcher } from "svelte";
  import { API, create, target } from "nouislider";
  import { RangeSliderMark } from "./library/types";
  export let name: string,
    value: number,
    min: number,
    max: number,
    disabled: boolean,
    marks: RangeSliderMark[] = [];
  let element: target, api: API;
  const dispatcher = createEventDispatcher();
  $: initializeSlider = () => {
    if (api) api.destroy();
    api = create(element, {
      connect: false,
      range: {
        min,
        max,
      },
      pips: {
        mode: "values",
        filter: (value: number) =>
          marks.some((m) => m.value === value) ? 1 : -1,
        format: {
          to: (value: number) => {
            const mark = marks.find((m) => m.value === value);
            return mark?.label || mark?.value.toString() || value.toString();
          },
        },
        values: marks.map((m) => m.value),
        density: 1,
      },
      start: value,
    } as any);
    api.on("slide", (values) => dispatcher("change", { value: values[0] }));
  };
  onMount(() => initializeSlider());
  $: if (
    api &&
    ((api.options.pips as any).values.length !== marks.length ||
      !(api.options.pips as any).values.every(
        (v: number, i: number) => v == marks[i]?.value
      ) ||
      api.options.range.max !== max ||
      api.options.range.min !== min)
  ) {
    initializeSlider();
  }
  $: if (api && api.get() !== value) api.set([value, value * 2]);
</script>

<div {disabled} bind:this={element} class="range-slider" />

<style>
  .range-slider {
    height: 18px;
  }
</style>
