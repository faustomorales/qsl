<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import LabelPanelEntry from "./LabelPanelEntry.svelte";
  import type { LabelConfig, LabelData } from "../library/types";
  export let config: LabelConfig[],
    labels: LabelData,
    disabled: boolean,
    configShortcuts: { [key: string]: string } | undefined = undefined,
    editableConfig: boolean;
  const dispatcher = createEventDispatcher();
  const createChangeCallback =
    (name: string) => (event: { detail: { selected: string[] } }) =>
      dispatcher("change", {
        labels: { ...labels, [name]: event.detail.selected },
      });
  const createEditConfigCallback = (name: string) => () =>
    dispatcher("editConfig", { name });
</script>

<div class="label-panel">
  {#each config as entry, entryi}
    {#if entryi !== 0 && config[entryi - 1].panelrow !== entry.panelrow}
      <div class="break" />
    {/if}
    <LabelPanelEntry
      config={entry}
      shortcut={configShortcuts ? configShortcuts[entry.name] : undefined}
      selected={labels[entry.name]}
      disabled={!!(disabled || entry.disabled)}
      {editableConfig}
      on:change={createChangeCallback(entry.name)}
      on:editConfig={createEditConfigCallback(entry.name)}
    />
  {/each}
</div>

<style>
  .label-panel {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    column-gap: 30px;
    row-gap: 10px;
    position: relative;
  }
  :global(input),
  :global(textarea) {
    font-size: 11pt;
  }
  .break {
    flex-basis: 100%;
    height: 0;
  }
</style>
