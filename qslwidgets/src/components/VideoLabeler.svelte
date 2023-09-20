<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type {
    TimestampedLabel,
    Config,
    ArbitraryMetadata,
    WidgetActions,
    Point,
  } from "../library/types";
  import {
    insertOrAppendByTimestamp,
    createContentLoader,
    createDraftStore,
    labels4timestamp,
  } from "../library/common";
  import MediaViewer from "./MediaViewer.svelte";
  import RegionList from "./RegionList.svelte";
  import Metadata from "./Metadata.svelte";
  import Playbar from "./Playbar.svelte";
  import ControlMenu from "./ControlMenu.svelte";
  import { getStores } from "../library/instanceStores";
  export let target: string | undefined,
    config: Config,
    labels: TimestampedLabel[],
    metadata: ArbitraryMetadata = {},
    navigation: boolean = false,
    editableConfig: boolean = false,
    maxCanvasSize: number = 512,
    transitioning: boolean = false,
    viewHeight: number = 384,
    actions: WidgetActions = {};
  const dispatcher = createEventDispatcher();
  let main: HTMLVideoElement;
  let mini: HTMLVideoElement;
  let { label: frame } = labels4timestamp(labels, 0);
  let cursor: Point | undefined = undefined;
  let { draft, history } = createDraftStore();
  let playback = {
    paused: true,
    muted: false,
    playhead: 0,
    t1: 0,
    t2: undefined,
  } as {
    paused: boolean;
    muted: boolean;
    playhead: number;
    t1: number;
    t2: undefined | number;
  };
  $: ({ callbacks: loadCallbacks, state: loadState } = createContentLoader({
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
  const synchronize = () => {
    if (playback.paused) {
      const existing = labels4timestamp(labels, playback.t1);
      frame = existing.label;
      if (!existing.exists) {
        playback = {
          ...playback,
          t2: $loadState.mediaState?.states[0].duration,
        };
      }
      draft.reset(frame.labels);
    } else {
      console.error(
        "synchronize() was called when unpaused, which should not occur."
      );
    }
  };
  const invalidateImage = () => {
    if ($draft.image) {
      draft.set({ ...$draft, image: null });
    }
  };
  // If our enhancements change.
  let { enhancements } = getStores();
  $: $enhancements, invalidateImage();
  // If the external inputs change ...
  $: target, labels, $loadState, synchronize();
  // If our current timestamp changes.
  $: if (frame.timestamp !== playback.t1) synchronize();
  const save = () => {
    if (playback.paused && playback.t1 !== undefined) {
      const current = {
        labels: draft.export($loadState.mediaState?.states[0].size),
        timestamp: playback.t1!,
        end: playback.t2,
      };
      labels = insertOrAppendByTimestamp(current, labels || []);
      dispatcher("save");
    } else {
      console.error("Attempted to save while playing or t1 was undefined.");
    }
  };
</script>

<!-- svelte-ignore a11y-media-has-caption -->

<MediaViewer
  {viewHeight}
  size={$loadState.mediaState?.states[0].size}
  loadState={transitioning ? "loading" : $loadState.loadState}
>
  <video
    slot="main"
    bind:this={main}
    src={target}
    on:loadedmetadata={loadCallbacks[0].load}
    on:error={loadCallbacks[0].error}
  />
  <video slot="mini" bind:this={mini} src={target} />
  <RegionList
    slot="regions"
    target={main}
    on:change={draft.snapshot}
    {maxCanvasSize}
    bind:image={$draft.image}
    bind:drawing={$draft.drawing}
    bind:labels={$draft.labels}
    bind:cursor
  />
  <Playbar
    mains={[main]}
    secondaries={[mini]}
    bind:playhead={playback.playhead}
    t1={playback.t1}
    t2={playback.t2}
    on:setMarkers={(event) => {
      playback = { ...playback, ...event.detail };
    }}
    bind:paused={playback.paused}
    bind:muted={playback.muted}
    marks={labels.map((l) => ({
      value: l.timestamp,
      label: l.timestamp.toFixed(2).toString(),
    }))}
    duration={$loadState.mediaState?.states[0].duration}
    disabled={$draft.dirty}
    slot="custom-controls"
  />
</MediaViewer>
<Metadata {metadata} />
<Metadata metadata={$draft.drawing.active?.region.metadata} />
<ControlMenu
  bind:config
  bind:draft={$draft}
  on:change={draft.snapshot}
  on:next
  on:prev
  on:delete
  on:ignore
  on:unignore
  on:showIndex
  on:undo={() => history.undo()}
  on:save={save}
  on:reset={() => draft.reset(frame.labels)}
  disabled={transitioning ||
    !playback.paused ||
    $loadState.loadState === "loading"}
  {editableConfig}
  {navigation}
  actions={{ ...actions, undo: $history > 0 }}
/>
