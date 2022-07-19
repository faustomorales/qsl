<script lang="ts">
  import type {
    Labels,
    Config,
    WidgetActions,
    CompoundTarget,
    ArbitraryMetadata,
  } from "../library/types";
  import { createEventDispatcher } from "svelte";
  import { createDraftStore, focus } from "../library/common";
  import ClickTarget from "./ClickTarget.svelte";
  import EnhancementControls from "./EnhancementControls.svelte";
  import RangeSlider from "./RangeSlider.svelte";
  import ControlMenu from "./ControlMenu.svelte";
  import ItemGrid from "./ItemGrid.svelte";
  import BatchImageItem from "./BatchImageItem.svelte";
  import Metadata from "./Metadata.svelte";
  export let labels: Labels,
    config: Config,
    target: CompoundTarget | undefined = undefined,
    navigation: boolean = false,
    editableConfig: boolean = false,
    transitioning: boolean = false,
    metadata: ArbitraryMetadata | undefined = undefined,
    actions: WidgetActions = {};
  let columnSize = 256;
  let container: HTMLDivElement;

  const dispatcher = createEventDispatcher();
  const { draft, history } = createDraftStore();
  const click = () => focus(container);
  $: target, labels, draft.reset(labels);
</script>

<div bind:this={container} class="container">
  <ClickTarget />
  <ItemGrid itemSize={columnSize} on:click={click}>
    {#if !transitioning && target}
      {#each target.images as entry}
        <BatchImageItem
          on:click={click}
          size={columnSize}
          src={entry.target}
          metadata={entry.metadata}
        />
      {/each}
    {/if}
  </ItemGrid>
  <Metadata {metadata} />
  <EnhancementControls>
    <RangeSlider
      bind:value={columnSize}
      min={100}
      max={600}
      marks={[{ value: 128 }, { value: 256 }, { value: 384 }, { value: 512 }]}
      disabled={false}
      name="Size"
    />
  </EnhancementControls>
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
    disableRegions={true}
    on:reset={() => draft.reset(labels)}
    disabled={transitioning}
    {editableConfig}
    {navigation}
    actions={{
      ...actions,
      undo: $history > 0,
    }}
  />
</div>

<style>
  .container {
    position: relative;
    display: flex;
    flex-direction: column;
    row-gap: 10px;
  }
</style>
