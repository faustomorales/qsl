<script lang="ts">
  import "nouislider/dist/nouislider.css";
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { create } from "nouislider";
  import type { API, target } from "nouislider";
  import type { RangeSliderMark } from "../library/types";
  import { focus } from "../library/common";
  import IconButton from "./IconButton.svelte";
  import Muted from "./icons/Muted.svelte";
  import Unmuted from "./icons/Unmuted.svelte";
  import Pause from "./icons/Pause.svelte";
  import Play from "./icons/Play.svelte";
  export let mains: HTMLVideoElement[] = [],
    secondaries: HTMLVideoElement[] = [],
    disabled: boolean | undefined,
    marks: RangeSliderMark[] = [],
    limitToBounds: boolean = false,
    duration: number | undefined = undefined,
    playhead: number = 0,
    t1: number | undefined = undefined,
    t2: number | undefined = undefined,
    paused: boolean = true,
    muted: boolean = true;
  let intervalId: number;
  let slider: target, api: API;
  interface $$Events {
    setMarkers: CustomEvent<{ t1: number; t2: number | undefined }>;
  }
  type Dispatcher<TEvents extends Record<keyof TEvents, CustomEvent<any>>> = {
    [Property in keyof TEvents]: TEvents[Property]["detail"];
  };
  const dispatcher = createEventDispatcher<Dispatcher<$$Events>>();
  $: primary = mains[0];
  $: initializeSlider = () => {
    if (api) api.destroy();
    api = create(slider, {
      connect: t2 !== undefined ? [false, false, true, false] : false,
      range: {
        min: 0,
        max: duration || 60,
      },
      behaviour: "unconstrained-tap",
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
      start: [playhead, ...[t1, t2].filter((f) => f !== undefined)],
    } as any);
    let midSlide = false;
    api.on("slide", (values, handle, unencoded, tap) => {
      midSlide = !tap;
      if (handle == 0 || tap) {
        // Taps are *always* for the main (first) handle, this
        // fixes the handles to where they ought to
        // be in case nouislider tried to assign the value
        // to another handle. If it did it correctly,
        // this has no effect. If it did it incorrectly,
        // this will swap the values.
        playhead = Math.min(
          Math.max(
            unencoded[handle],
            limitToBounds && t1 !== undefined ? t1 : -Infinity
          ),
          limitToBounds && t2 !== undefined ? t2 : Infinity
        );
      } else {
        const tiu = unencoded[handle];
        if (handle == 1) {
          dispatcher("setMarkers", { t1: tiu, t2 });
        } else if (handle == 2) {
          // Setting t2 to t1 the starting point
          // is the same as "deselecting" it.
          if (t1 === undefined) {
            console.error(
              "t2 was set while t1 was unset. This is not supported."
            );
          } else {
            dispatcher("setMarkers", {
              t1,
              t2: Math.abs(tiu - t1) < 1e-2 ? undefined : tiu,
            });
          }
        }
      }
    });
    api.on("end", (values, handle) => {
      if (handle === 0 && !midSlide) {
        const setting =
          t1 === undefined
            ? null
            : t2 === undefined
            ? "t1"
            : playhead <= t1 ||
              Math.abs(playhead - t1) < Math.abs(playhead - t2)
            ? "t1"
            : "t2";
        if (setting == "t1") {
          dispatcher("setMarkers", { t1: playhead, t2 });
        } else if (setting == "t2" && t1 !== undefined) {
          dispatcher("setMarkers", { t1, t2: playhead });
        } else {
          console.error("Could not choose how to handle end of drag/click.");
        }
      }
      midSlide = false;
    });
    const handles = Object.fromEntries(
      [
        { name: "playhead", index: 0 },
        { name: "t1", index: 1 },
        { name: "t2", index: 2 },
      ].map((item) => [
        item.name,
        slider.querySelector(`.noUi-handle[data-handle="${item.index}"]`),
      ])
    );
    handles["playhead"]?.parentElement?.classList.add("playhead");
    handles["t1"]?.addEventListener("click", () => (playhead = t1 as number));
    handles["t2"]?.addEventListener("click", () => (playhead = t2 as number));
    // Handle clicks on labels.
    slider.querySelectorAll(".noUi-value").forEach((p) =>
      p.addEventListener("click", () => {
        playhead = parseFloat((p as any).dataset.value);
        focus(slider);
      })
    );
  };
  $: setPauseState = (pause: boolean) => {
    [...mains, ...secondaries].forEach((t) => {
      if (!t) {
        return;
      }
      if (t.paused != pause) {
        if (pause) {
          t.pause();
        } else {
          t.play();
        }
      }
    });
    if (paused !== pause) {
      paused = pause;
    }
  };
  onMount(() => {
    initializeSlider();
    intervalId = setInterval(() => {
      if (!api || !mains || mains.length == 0) return;
      const incorrectMarks =
        (api.options.pips as any).values.length !== (marks || []).length ||
        !(api.options.pips as any).values.every(
          (v: number, i: number) => v == marks[i]?.value
        );
      const incorrectDuration = api.options.range.max !== duration;
      const incorrectConnect =
        (t2 !== undefined && !Array.isArray(api.options.connect)) ||
        (t2 === undefined && api.options.connect);
      if (incorrectMarks || incorrectDuration || incorrectConnect) {
        initializeSlider();
      }
      if (primary.paused) {
        [
          { targets: mains, time: playhead },
          {
            targets: secondaries,
            time: t2 !== undefined ? t2 : t1 !== undefined ? t1 : playhead,
          },
        ].forEach((group) =>
          group.targets.forEach((t) => {
            if (t !== undefined && group.time !== t.currentTime) {
              t.currentTime = group.time;
            }
          })
        );
      } else {
        if (limitToBounds && t2 !== undefined && primary.currentTime >= t2) {
          playhead = t2;
          setPauseState(true);
        } else {
          playhead = primary.currentTime;
        }
      }
      if (primary) {
        paused = primary.paused;
        muted = primary.muted;
      }
      const setValues = [
        playhead,
        ...([t1, t2].filter((v) => v !== undefined) as number[]),
      ];
      const getValues = api.get(true) as number[];
      if (
        getValues.length !== setValues.length ||
        getValues.some((v, i) => Math.abs(v - setValues[i]) > 1e-3)
      ) {
        api.set(setValues);
      }
    }, 10) as unknown as number;
  });
  $: paused, setPauseState(paused);
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
      const value = !primary.muted;
      [...mains, ...secondaries].forEach((t) => (t.muted = value));
    }}
  >
    {#if muted}
      <Muted />
    {:else}
      <Unmuted />
    {/if}
  </IconButton>
  <IconButton {disabled} on:click={() => setPauseState(!primary.paused)}>
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
  .range-slider :global(.noUi-origin.playhead) {
    z-index: 10 !important;
  }
  .range-slider :global(.noUi-handle[data-handle="0"]) {
    border-color: yellow;
    border-width: 2px;
    height: 10px;
    width: 10px;
    right: -5px;
    top: -2px;
  }

  .range-slider :global(.noUi-handle[data-handle="1"]) {
    border-color: green;
  }

  .range-slider :global(.noUi-handle[data-handle="2"]) {
    border-color: red;
  }

  .range-slider :global(.noUi-connect) {
    background-color: var(--color1);
  }
</style>
