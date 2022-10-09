<script lang="ts">
  import type {
    Labels,
    Config,
    WidgetActions,
    ImageGroupTarget,
    ArbitraryMetadata,
  } from "../library/types";
  import { createEventDispatcher } from "svelte";
  import {
    createDraftStore,
    focus,
    elementIsFocused,
    processSelectionChange,
  } from "../library/common";
  import ClickTarget from "./ClickTarget.svelte";
  import EnhancementControls from "./EnhancementControls.svelte";
  import RangeSlider from "./RangeSlider.svelte";
  import ControlMenu from "./ControlMenu.svelte";
  import ItemGrid from "./ItemGrid.svelte";
  import BatchImageItem from "./BatchImageItem.svelte";
  import Metadata from "./Metadata.svelte";
  export let labels: Labels,
    config: Config,
    target: ImageGroupTarget | undefined = undefined,
    navigation: boolean = false,
    editableConfig: boolean = false,
    transitioning: boolean = false,
    metadata: ArbitraryMetadata | undefined = undefined,
    actions: WidgetActions = {};
  let currentKey: string | undefined = undefined;
  let columnSize = 256;
  let container: HTMLDivElement;

  const dispatcher = createEventDispatcher();
  const { draft, history } = createDraftStore();
  const click = () => focus(container);
  const createClickHandler = (index: number) => () => {
    if (target?.onClick) {
      let key = currentKey || "";
      let label = target.onClick[key];
      const labelConfig = label
        ? config.image?.find((c) => c.name === label)
        : undefined;
      if (label && labelConfig) {
        draft.snapshot();
        draft.set({
          ...$draft,
          labels: {
            ...$draft.labels,
            image: {
              ...$draft.labels.image,
              [label]: processSelectionChange(
                index.toString(),
                $draft.labels["image"][label],
                labelConfig.multiple,
                labelConfig.required
              ),
            },
          },
        });
      }
    }
    click();
  };
  $: configMap = config.image
    ? config.image.reduce((previous, current) => {
        previous[current.name] = current.displayName || current.name;
        return previous;
      }, {} as { [key: string]: string })
    : ({} as { [key: string]: string });
  $: summarize = (index: number) => {
    const matches = target?.onClick
      ? Object.values(target.onClick).reduce(
          (previous, name) =>
            configMap[name] &&
            ($draft.labels.image[name] || []).indexOf(index.toString()) > -1
              ? previous.concat([configMap[name]])
              : previous,
          [] as string[]
        )
      : [];
    return matches.length > 0 ? matches.join(", ") : false;
  };
  $: target, labels, draft.reset(labels);
  $: configShortcuts = target?.onClick
    ? Object.fromEntries(
        Object.entries(target.onClick).map(([key, value]) => [value, key])
      )
    : undefined;
  $: groups = (target && target.images ? target.images : []).reduce(
    (groups, entry) =>
      entry.group && groups.indexOf(entry.group) == -1
        ? groups.concat([entry.group])
        : groups,
    [] as string[]
  );
  const onWindowKeydown = (event: any) => {
    if (
      (elementIsFocused(container) || event.key == currentKey) &&
      target?.onClick &&
      target.onClick[event.key]
    ) {
      event.preventDefault();
      event.stopPropagation();
      currentKey = event.key;
    } else {
      currentKey = undefined;
    }
  };
</script>

<svelte:window
  on:keydown={onWindowKeydown}
  on:keyup={() => {
    currentKey = undefined;
  }}
/>
<div bind:this={container} class="container">
  <ClickTarget />
  <ItemGrid itemSize={columnSize} on:click={click}>
    {#if !transitioning && target && target.images}
      {#each target.images as entry, entryi}
        {#if !entry.group}
          <BatchImageItem
            on:click={createClickHandler(entryi)}
            size={columnSize}
            src={entry.target}
            metadata={entry.metadata}
            labeled={summarize(entryi)}
          />
        {/if}
      {/each}
    {/if}
  </ItemGrid>
  {#if groups}
    {#each groups as group}
      <h2>{group}</h2>
      <ItemGrid itemSize={columnSize} on:click={click}>
        {#if !transitioning && target && target.images}
          {#each target.images as entry, entryi}
            {#if entry.group == group}
              <BatchImageItem
                on:click={createClickHandler(entryi)}
                size={columnSize}
                src={entry.target}
                metadata={entry.metadata}
                labeled={summarize(entryi)}
              />
            {/if}
          {/each}
        {/if}
      </ItemGrid>
    {/each}
  {/if}
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
    {configShortcuts}
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
