<script lang="ts">
  import Playbar from "./Playbar.svelte";
  import {createEventDispatcher } from "svelte"
  import type { RangeSliderMark } from "../library/types.js";
  import { createContentLoader } from "../library/common.js";
  export let target: string,
    t1: number | undefined,
    t2: number | undefined,
    playhead: number = t1 || 0,
    paused: boolean = true,
    muted: boolean = false,
    limitToBounds: boolean = true,
    marks: RangeSliderMark[] = [],
    disabled: boolean = false;
  let video: HTMLVideoElement;
  let dispatcher = createEventDispatcher()
  $: ({ callbacks, state } = createContentLoader({
    targets: [target],
    load: async (event: { currentTarget: HTMLElement }) => {
      const target = event.currentTarget as HTMLVideoElement;
      const mediaState = {
        size: {
          width: target.videoWidth,
          height: target.videoHeight,
        },
        duration: target.duration,
      }
      dispatcher("loaded", mediaState)
      return mediaState;
    },
  }));
</script>

<!-- svelte-ignore a11y-media-has-caption -->
<div class="player">
  <video
    bind:this={video}
    src={target}
    on:loadedmetadata={callbacks[0].load}
    on:error={callbacks[0].error}
  />
  <Playbar
    mains={[video]}
    {t1}
    {t2}
    on:setMarkers
    bind:paused
    bind:muted
    bind:playhead
    {limitToBounds}
    {marks}
    duration={$state.mediaState?.states[0].duration}
    {disabled}
  />
</div>

<style>
  .player {
    display: flex;
    flex-direction: column;
  }
  .player video {
    width: 100%;
  }
</style>
