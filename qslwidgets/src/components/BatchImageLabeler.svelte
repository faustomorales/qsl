<script lang="ts">
  import type {
    BatchEntry,
    Labels,
    Config,
    WidgetActions,
  } from "../library/types";
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import { createDraftStore, focus } from "../library/common";
  import Metadata from "./Metadata.svelte";
  import EnhancementControls from "./EnhancementControls.svelte";
  import RangeSlider from "./RangeSlider.svelte";
  import Checked from "./icons/Checked.svelte";
  import Unchecked from "./icons/Unchecked.svelte";
  import IconButton from "./IconButton.svelte";
  import Labeled from "./icons/Labeled.svelte";
  import Ignored from "./icons/Ignored.svelte";
  import ControlMenu from "./ControlMenu.svelte";
  export let labels: Labels,
    config: Config,
    states: BatchEntry[] = [],
    targets: (string | undefined)[] = [],
    navigation: boolean = false,
    editableConfig: boolean = false,
    transitioning: boolean = false,
    actions: WidgetActions = {};
  let columnSize = 256;
  let container: HTMLDivElement;
  let containerWidth: number;
  let columnGap = 10;
  const dispatcher = createEventDispatcher();
  const { draft, history } = createDraftStore();
  let intervalId: number;
  onMount(() => {
    intervalId = setInterval(() => {
      if (container.clientWidth !== containerWidth) {
        containerWidth = container.clientWidth;
      }
    }) as unknown as number;
  });
  onDestroy(() => clearInterval(intervalId));
  const createSelectionToggle = (index: number) => () => {
    states = states
      .slice(0, index)
      .concat([{ ...states[index], selected: !states[index].selected }])
      .concat(states.slice(index + 1));
    focus(container);
  };
  const createMassSelection = (selected: boolean) => () =>
    (states = states.map((s) => ({
      ...s,
      selected: s.visible ? selected : s.selected,
    })));
  const createErrorHandler = (index: number) => () => {
    const item = container.querySelector(
      `.image-grid-item[data-index='${index}'`
    );
    if (item) {
      item.classList.add("error");
    }
  };
  $: columns = containerWidth
    ? Math.max(Math.floor(containerWidth / (columnGap + columnSize)), 1)
    : 1;
  $: targets, labels, draft.reset(labels);
  $: items =
    targets.length === states.length
      ? targets
          .map((target, index) => ({ target, state: states[index], index }))
          .filter((entry) => entry.state.visible)
      : [];
</script>

<div
  class="image-grid"
  style="--batch-item-size: {columnSize}; --batch-item-gap: {columnGap}"
  bind:this={container}
>
  {#each Array(columns) as _, columni}
    <div class="image-grid-column">
      {#each items as entry, entryi}
        {#if entryi % columns == columni}
          <div
            class="image-grid-item"
            data-index={entry.index}
            on:click={createSelectionToggle(entry.index)}
          >
            <img
              src={entry.target}
              on:error={createErrorHandler(entry.index)}
              alt="{entry.target} failed to load."
            />
            <span class="error-message">{entry.target} failed to load.</span>
            <div class="image-grid-item-actions">
              <div class="image-grid-item-actions-container">
                {#if entry.state.labeled || entry.state.ignored}
                  <IconButton>
                    {#if entry.state.labeled}
                      <Labeled />
                    {:else}
                      <Ignored />
                    {/if}
                  </IconButton>
                {/if}
                <div class="image-grid-item-actions-spacer" />
                <IconButton>
                  {#if entry.state.selected}
                    <Checked />
                  {:else}
                    <Unchecked />
                  {/if}
                </IconButton>
              </div>
            </div>
            <Metadata metadata={entry.state.metadata} />
          </div>
        {/if}
      {/each}
    </div>
  {/each}
</div>
<div class="controls">
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
</div>
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
  on:selectAll={createMassSelection(true)}
  on:selectNone={createMassSelection(false)}
  on:undo={() => history.undo()}
  on:save={() => {
    labels = draft.export();
    dispatcher("save");
  }}
  on:reset={() => draft.reset(labels)}
  disabled={transitioning}
  {editableConfig}
  {navigation}
  actions={{
    ...actions,
    undo: $history > 0,
    selectAll: states.some((s) => s.visible && !s.selected),
    selectNone: states.some((s) => s.visible && s.selected),
  }}
/>

<style>
  .image-grid {
    position: relative;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    column-gap: calc(var(--batch-item-gap) * 1px);
  }
  .image-grid-column {
    display: flex;
    flex-direction: column;
    row-gap: calc(var(--batch-item-gap) * 1px);
  }
  .image-grid-item {
    position: relative;
    overflow: hidden;
    border-radius: 16px;
    padding-top: 32px;
    width: calc(var(--batch-item-size) * 1px);
    border: 1px solid var(--border-color);
  }
  .image-grid-item :global(.metadata) {
    border-radius: 0 0 16px 16px;
    border-width: 1px 0 0 0;
  }
  .image-grid-item-actions {
    position: absolute;
    top: 0;
    height: 32px;
    background-color: var(--background-color);
    width: 100%;
    border-radius: 16px 16px 0 0;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .image-grid-item-actions-container {
    padding: 3px 8px;
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
  }
  .image-grid-item-actions-spacer {
    flex-basis: 100%;
    width: 100%;
  }
  .image-grid-item img {
    vertical-align: bottom;
    object-fit: contain;
    min-width: calc(var(--batch-item-size) * 1px);
    max-width: calc(var(--batch-item-size) * 1px);
    max-height: calc(var(--batch-item-size) * 2px);
    filter: var(--image-enhancements-filter);
  }

  .image-grid .image-grid-item .error-message {
    display: none;
    padding: calc(var(--batch-item-gap) * 1px);
  }

  .image-grid :global(.image-grid-item.error .error-message) {
    display: block;
  }

  .image-grid :global(.image-grid-item.error img) {
    display: none;
  }
</style>
