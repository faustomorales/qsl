<script lang="ts">
  import "nouislider/dist/nouislider.css";
  import { onMount, onDestroy } from "svelte";
  import { API, create, target } from "nouislider";
  import { RangeSliderMark } from "./library/types";
  import { focus } from "./library/common";
  import IconButton from "./IconButton.svelte";
  import Muted from "./icons/Muted.svelte";
  import Unmuted from "./icons/Unmuted.svelte";
  import Pause from "./icons/Pause.svelte";
  import Play from "./icons/Play.svelte";
  export let e1: HTMLVideoElement,
    e2: HTMLVideoElement,
    disabled: boolean | undefined,
    marks: RangeSliderMark[] = [],
    duration: number | undefined = undefined,
    t1: number = 0,
    t2: number | undefined = undefined,
    paused: boolean = true,
    muted: boolean = true;
  let intervalId: number;
  let slider: target, api: API;
  $: initializeSlider = () => {
    if (api) api.destroy();
    api = create(slider, {
      connect: t2 !== undefined ? true : false,
      range: {
        min: 0,
        max: duration || 60,
      },
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
      start: [t1, t2 !== undefined ? t2 : duration],
    } as any);
    api.on("slide", (values, handle, unencoded, tap) => {
      if (handle == 0 || tap) {
        t1 = parseFloat(values[handle] as any);
        // Taps are *always* for the main handle, this
        // fixes the handles to where they ought to
        // be in case nouislider tried to assign the value
        // to the second handle. If it did it correctly,
        // this has no effect. If it did it incorrectly,
        // this will swap the values.
        if (tap) {
          api.set([t1, values[1 - handle]]);
        }
      } else {
        const t2u = parseFloat(values[handle] as any);
        if (t2u === t1) {
          // Setting the endpoint to the starting point
          // is the same as "deselecting" it.
          t2 = undefined;
        } else {
          t2 = t2u;
        }
      }
    });
    slider.querySelectorAll(".noUi-value").forEach((p) =>
      p.addEventListener("click", () => {
        t1 = parseFloat((p as any).dataset.value);
        api.setHandle(0, t1);
        focus(slider);
      })
    );
  };
  onMount(() => {
    initializeSlider();
    intervalId = setInterval(() => {
      if (!api || !e1 || !e2) return;
      const incorrectMarks =
        (api.options.pips as any).values.length !== (marks || []).length ||
        !(api.options.pips as any).values.every(
          (v: number, i: number) => v == marks[i]?.value
        );
      const incorrectDuration = api.options.range.max !== duration;
      const incorrectConnect = api.options.connect !== (t2 !== undefined);
      if (incorrectMarks || incorrectDuration || incorrectConnect) {
        initializeSlider();
      }
      if (e1.paused) {
        const expectedElementTimes = { e1: t1, e2: t2 !== undefined ? t2 : t1 };
        const expectedSliderTimes = {
          e2: t2 !== undefined ? t2 : e1.duration,
        };
        if (
          e1.currentTime !== expectedElementTimes.e1 ||
          e2.currentTime !== expectedElementTimes.e2
        ) {
          e1.currentTime = expectedElementTimes.e1;
          e2.currentTime = expectedElementTimes.e2;
        }
        // The main slider gets set through playback (see below) or
        // through clicking on shortcuts (see the initialization of event
        // listeners above).
        const [_, st2] = (api.get() as string[]).map((s) => parseFloat(s));
        if (st2 !== expectedSliderTimes.e2) {
          api.setHandle(1, expectedSliderTimes.e2);
        }
      } else {
        t1 = e1.currentTime;
        t2 = undefined;
        api.set([t1, e1.duration]);
      }
      if (e1) {
        paused = e1.paused;
        muted = e1.muted;
      }
    }, 10) as unknown as number;
  });
  onDestroy(() => clearInterval(intervalId));
  $: if (slider) {
    let main = slider.querySelectorAll(".noUi-origin")[0];
    disabled
      ? main.setAttribute("disabled", "true")
      : main.removeAttribute("disabled");
    !paused
      ? slider.setAttribute("disabled", "true")
      : slider.removeAttribute("disabled");
  }
</script>

<div class="playbar-container">
  <IconButton
    on:click={() => {
      const value = !e1.muted;
      e1.muted = value;
      e2.muted = value;
    }}
  >
    {#if muted}
      <Muted />
    {:else}
      <Unmuted />
    {/if}
  </IconButton>
  <IconButton
    {disabled}
    on:click={() => {
      const value = !e1.paused;
      if (!value) {
        e1.play();
        e2.play();
      } else {
        e1.pause();
        e2.pause();
      }
    }}
  >
    {#if paused}
      <Play />
    {:else}
      <Pause />
    {/if}
  </IconButton>
  <div bind:this={slider} class="range-slider" />
</div>

<style>
  .playbar-container {
    height: 35px;
    display: flex;
    flex-direction: row;
    align-items: center;
    color: var(--label-color);
    font-size: 12pt;
    z-index: 1;
    position: relative;
    column-gap: 10px;
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
  .range-slider:not([disabled="true"])
    :global(.noUi-origin:not([disabled="true"]) .noUi-handle),
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
  }
  .range-slider:not([disabled="true"]) :global(.noUi-value) {
    cursor: pointer;
  }

  .range-slider :global(.noUi-handle[data-handle="0"]) {
    border-color: green;
  }

  .range-slider :global(.noUi-handle[data-handle="1"]) {
    border-color: red;
  }

  .range-slider :global(.noUi-connect) {
    background-color: var(--color1);
  }
</style>
