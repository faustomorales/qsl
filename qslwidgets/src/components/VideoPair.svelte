<script lang="ts">
  import type { DraftState, VideoSegmentTarget } from "../library/types.js";
  import { createEventDispatcher } from "svelte";
  import Play from "../icons/Play.svelte";
  import Pause from "../icons/Pause.svelte";
  import Restart from "../icons/Restart.svelte";
  import IconButton from "./IconButton.svelte";
  import VideoWithPlaybar from "./VideoWithPlaybar.svelte";
  export let target: VideoSegmentTarget,
    draft: DraftState,
    playbackState: {
      video1: { paused: boolean; playhead: number };
      video2: { paused: boolean; playhead: number };
    };
  const dispatcher = createEventDispatcher();
  $: timestampInfo =
    draft.timestampInfo && "match" in draft.timestampInfo
      ? draft.timestampInfo
      : null;
  $: state = !timestampInfo
    ? "error"
    : !playbackState.video1.paused || !playbackState.video2.paused
    ? "playing"
    : playbackState.video1.playhead == timestampInfo.timestamp &&
      playbackState.video2.playhead == timestampInfo.match!.timestamp
    ? "initialized"
    : "uninitialized";
  const onClick = () => {
    if (state == "playing" || state == "initialized") {
      let paused = state == "playing" ? true : false;
      playbackState.video1.paused = paused;
      playbackState.video2.paused = paused;
    } else if (timestampInfo) {
      playbackState.video1.playhead = timestampInfo.timestamp;
      playbackState.video2.playhead = timestampInfo.match.timestamp;
    }
  };
</script>
  <div class="video-pair">
    <div style="--icon-button-size: 2.5rem">
      <IconButton on:click={onClick}>
        {#if state == "playing"}
          <Pause />
        {:else if state == "initialized"}
          <Play />
        {:else}
          <Restart />
        {/if}
      </IconButton>
    </div>
    <!-- svelte-ignore a11y-media-has-caption -->
    <VideoWithPlaybar
      target={target.video1.target}
      t1={timestampInfo?.timestamp}
      t2={timestampInfo?.end}
      bind:playhead={playbackState.video1.playhead}
      bind:paused={playbackState.video1.paused}
      on:loaded={(event) => dispatcher("loaded-video1", event.detail)}
      on:setMarkers={(event) => {
        dispatcher("change");
        draft = {
          ...draft,
          dirty: true,
          timestampInfo: {
            ...draft.timestampInfo,
            timestamp: event.detail.t1,
            end: event.detail.t2,
          },
        };
      }}
    />
    <!-- svelte-ignore a11y-media-has-caption -->
    <VideoWithPlaybar
      target={target.video2.target}
      t1={timestampInfo?.match.timestamp}
      t2={timestampInfo?.match.end}
      bind:playhead={playbackState.video2.playhead}
      bind:paused={playbackState.video2.paused}
      on:loaded={(event) => dispatcher("loaded-video2", event.detail)}
      on:setMarkers={(event) => {
        if (
          event.detail.t1 !== undefined &&
          event.detail.t2 !== undefined &&
          draft.timestampInfo?.timestamp !== undefined &&
          draft.timestampInfo?.end !== undefined
        ) {
          dispatcher("change");
          draft = {
            ...draft,
            dirty: true,
            timestampInfo: {
              ...draft.timestampInfo,
              match: {
                timestamp: event.detail.t1,
                end: event.detail.t2,
              },
            },
          };
        }
      }}
    />
  </div>
<style>
  .video-pair {
    display: flex;
    flex-direction: row;
    align-items: center;
    column-gap: 10px;
  }
</style>
