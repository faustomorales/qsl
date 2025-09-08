<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { getStores } from "../library/instanceStores.js";
  import type {
    Config,
    Labels,
    Point,
    WidgetActions,
    ArbitraryMetadata,
    ImageStackTarget,
    StackContentState,
  } from "../library/types.js";
  import { createContentLoader, createDraftStore } from "../library/common.js";
  import LabelPanelEntry from "./LabelPanelEntry.svelte";
  import LabelerLayout from "./LabelerLayout.svelte";
  import ControlMenu from "./ControlMenu.svelte";
  import MediaViewer from "./MediaViewer.svelte";
  import RegionList from "./RegionList.svelte";
  import Metadata from "./Metadata.svelte";
  import ImageStack from "./ImageStack.svelte";
  export let target: ImageStackTarget | undefined,
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
  $: target, labels, draft.reset(labels);
  $: ({ state: loadState, callbacks: loadCallbacks } = createContentLoader({
    targets: [target],
    load: async (event: { detail: StackContentState }) => event.detail,
  }));
  let layout: "horizontal" | "vertical" = "vertical";
  $: selected = target ? [0] : [];
  // If our enhancements or selected image change.
  let { enhancements } = getStores();
  $: $enhancements, selected, invalidateImage();
  $: if ($loadState.mediaState)
    layout =
      $loadState.mediaState.states[0].size.width >
      $loadState.mediaState.states[0].size.height
        ? "vertical"
        : "horizontal";
</script>

<LabelerLayout {layout}>
  <svelte:fragment slot="content">
    {#if target}
      <MediaViewer
        size={$loadState.mediaState?.states[0].size}
        {viewHeight}
        loadState={transitioning ? "loading" : $loadState.loadState}
      >
        <ImageStack
          slot="main"
          stack={target}
          bind:element={image}
          on:load={loadCallbacks[0].load}
          {selected}
        />
        <ImageStack slot="mini" stack={target} {selected} />
        <RegionList
          slot="regions"
          target={image}
          on:change={draft.snapshot}
          {maxCanvasSize}
          {config}
          transform={$loadState.mediaState
            ? {
                size: $loadState.mediaState.states[0].size,
                layer: $loadState.mediaState.states[0].layers[selected[0]],
              }
            : undefined}
          bind:image={$draft.image}
          bind:drawing={$draft.drawing}
          bind:labels={$draft.labels}
          bind:cursor
        />
      </MediaViewer>
    {/if}
    <Metadata {metadata} />
    <Metadata metadata={$draft.drawing.active?.region.metadata} />
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
        labels = draft.export($loadState.mediaState?.states[0].size);
        dispatcher("save");
      }}
      on:reset={() => draft.reset(labels)}
      disabled={transitioning || $loadState.loadState === "loading"}
      {editableConfig}
      {navigation}
      actions={{ ...actions, undo: $history > 0 }}
    >
      <div slot="pre-button controls">
        <hr />
        <Metadata metadata={target?.images[selected[0]].metadata} />
        <LabelPanelEntry
          config={{
            required: true,
            name: "Selected Image",
            options: target
              ? target.images.map((image, imagei) => ({
                  name: imagei.toString(),
                  displayName: image.name,
                }))
              : [],
            multiple: false,
            freeform: false,
          }}
          disabled={!!$draft.drawing.active}
          selected={selected.map((s) => s.toString())}
          shortcut={undefined}
          editableConfig={false}
          on:change={(updated) =>
            (selected = [parseInt(updated.detail.selected[0])])}
        />
      </div>
    </ControlMenu>
  </svelte:fragment>
</LabelerLayout>
