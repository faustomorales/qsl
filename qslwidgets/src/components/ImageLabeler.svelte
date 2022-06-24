<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type {
    Config,
    Labels,
    Point,
    WidgetActions,
    ArbitraryMetadata,
  } from "./library/types";
  import {
    createContentLoader,
    createDraftStore,
  } from "./library/common";
  import ControlMenu from "./ControlMenu.svelte";
  import MediaViewer from "./MediaViewer.svelte";
  import RegionList from "./RegionList.svelte";
  import Metadata from "./Metadata.svelte";
  export let target: string | undefined,
    config: Config,
    labels: Labels,
    metadata: ArbitraryMetadata = {},
    navigation: boolean = false,
    editableConfig: boolean = false,
    maxCanvasSize: number = 512,
    transitioning: boolean = false,
    actions: WidgetActions = {};
  const dispatcher = createEventDispatcher();
  let image: HTMLImageElement;
  let cursor: Point | undefined = undefined;
  let { draft, history } = createDraftStore();
  $: target, labels, draft.reset(labels);
  $: ({ callbacks: loadCallbacks, state: loadState } = createContentLoader({
    target,
    load: async (event: { currentTarget: HTMLElement }) => {
      const target = event.currentTarget as HTMLImageElement;
      return {
        size: {
          width: target.naturalWidth,
          height: target.naturalHeight,
        },
      };
    },
  }));
</script>

<MediaViewer
  size={$loadState.mediaState?.size}
  loadState={transitioning ? "loading" : $loadState.loadState}
>
  <img
    slot="main"
    src={target}
    alt="labeling target image: {target}"
    on:load={loadCallbacks.load}
    on:error={loadCallbacks.error}
    bind:this={image}
  />
  <img slot="mini" src={target} alt="minimap for {target}" />
  <RegionList
    slot="regions"
    target={image}
    on:change={draft.snapshot}
    {maxCanvasSize}
    bind:image={$draft.image}
    bind:drawing={$draft.drawing}
    bind:labels={$draft.labels}
    bind:cursor
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
    labels = draft.export();
    dispatcher("save");
  }}
  on:reset={() => draft.reset(labels)}
  disabled={transitioning}
  {editableConfig}
  {navigation}
  actions={{ ...actions, undo: $history > 0 }}
/>
