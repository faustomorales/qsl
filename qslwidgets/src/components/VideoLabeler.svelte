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
  let frame: TimestampedLabel = labels4timestamp(labels, 0);
  let cursor: Point | undefined = undefined;
  let { draft, history } = createDraftStore();
  let playback = { paused: true, muted: false, t1: 0, t2: undefined } as {
    paused: boolean;
    muted: boolean;
    t1: number;
    t2: undefined | number;
  };
  const synchronize = () => {
    frame = labels4timestamp(labels, playback.t1);
    playback = { ...playback, t2: frame.end };
    draft.reset(frame.labels);
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
  $: target, labels, synchronize();
  // If our current timestamp changes.
  $: if (frame.timestamp !== playback.t1 && playback.paused) synchronize();
  $: ({ callbacks: loadCallbacks, state: loadState } = createContentLoader({
    target,
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

<MediaViewer
  {viewHeight}
  size={$loadState.mediaState?.size}
  loadState={transitioning ? "loading" : $loadState.loadState}
>
  <video
    slot="main"
    bind:this={main}
    src={target}
    alt="video located at {target}"
    on:loadedmetadata={loadCallbacks.load}
    on:error={loadCallbacks.error}
  />
  <video slot="mini" bind:this={mini} src={target} alt="minimap for {target}" />
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
    e1={main}
    e2={mini}
    bind:t1={playback.t1}
    bind:t2={playback.t2}
    bind:paused={playback.paused}
    bind:muted={playback.muted}
    marks={labels.map((l) => ({
      value: l.timestamp,
      label: l.timestamp.toFixed(2).toString(),
    }))}
    duration={$loadState.mediaState?.duration}
    disabled={$draft.dirty}
    slot="custom-controls"
  />
</MediaViewer>
<Metadata {metadata} />
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
  on:save={() => {
    labels = insertOrAppendByTimestamp(
      {
        labels: draft.export($loadState.mediaState?.size),
        timestamp: playback.t1,
        end: playback.t2,
      },
      labels || []
    );
    dispatcher("save");
  }}
  on:reset={() => draft.reset(frame.labels)}
  disabled={transitioning ||
    !playback.paused ||
    $loadState.loadState === "loading"}
  {editableConfig}
  {navigation}
  actions={{ ...actions, undo: $history > 0 }}
/>
