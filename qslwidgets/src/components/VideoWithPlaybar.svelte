<script lang="ts">
  import Playbar from "./Playbar.svelte";
  import type { RangeSliderMark } from "../library/types";
  import { createContentLoader } from "../library/common";
  export let target: string,
    t1: number,
    t2: number,
    playhead: number = t1,
    paused: boolean = true,
    muted: boolean = false,
    limitToBounds: boolean = true,
    marks: RangeSliderMark[] = [],
    disabled: boolean = false;
  let video: HTMLVideoElement;
  $: ({ callbacks, state } = createContentLoader({
    targets: [target],
    load: async (event: { currentTarget: HTMLElement }) => {
      const target = event.currentTarget as HTMLVideoElement;
      return {
        size: {
          width: target.videoWidth,
          height: target.videoHeight,
        },
        duration: target.duration,
      };
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
</style>
