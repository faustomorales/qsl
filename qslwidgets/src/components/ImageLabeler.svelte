<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { getStores } from "../library/instanceStores";
  import type {
    Config,
    Labels,
    Point,
    WidgetActions,
    ArbitraryMetadata,
  } from "../library/types";
  import { createContentLoader, createDraftStore } from "../library/common";
  import LabelerLayout from "./LabelerLayout.svelte";
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
    viewHeight: number = 384,
    actions: WidgetActions = {};
  const dispatcher = createEventDispatcher();
  let image: HTMLImageElement;
  let cursor: Point | undefined = undefined;
  let { draft, history } = createDraftStore();
  const invalidateImage = () => {
    if ($draft.image) {
      $draft.image.free();
      draft.set({ ...$draft, image: null });
    }
  };
  // If our enhancements change.
  let { enhancements } = getStores();
  $: $enhancements, invalidateImage();
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
  let layout: "horizontal" | "vertical" = "vertical";
  $: if ($loadState.mediaState)
    layout =
      $loadState.mediaState.size.width > $loadState.mediaState.size.height
        ? "vertical"
        : "horizontal";
</script>

<LabelerLayout {layout}>
  <svelte:fragment slot="content">
    {#if target}
      <MediaViewer
        size={$loadState.mediaState?.size}
        {viewHeight}
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
    {/if}
    <Metadata {metadata} />
  </svelte:fragment>
  <svelte:fragment slot="control">
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
      {layout}
      on:save={() => {
        labels = draft.export($loadState.mediaState?.size);
        dispatcher("save");
      }}
      on:reset={() => draft.reset(labels)}
      disabled={transitioning || $loadState.loadState === "loading"}
      {editableConfig}
      {navigation}
      actions={{ ...actions, undo: $history > 0 }}
    />
  </svelte:fragment>
</LabelerLayout>
