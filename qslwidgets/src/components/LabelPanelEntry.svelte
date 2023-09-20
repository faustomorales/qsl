<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { LabelConfig } from "../library/types";
  import {
    buildOptions,
    elementIsFocused,
    simulateClick,
    processSelectionChange,
    focus,
  } from "../library/common";
  import Edit from "./icons/Edit.svelte";
  import IconButton from "./IconButton.svelte";
  export let config: LabelConfig,
    disabled: boolean,
    selected: string[] | undefined,
    shortcut: string | undefined = undefined,
    editableConfig: boolean;
  const dispatcher = createEventDispatcher();
  let freeform = { value: "", dirty: false };
  let element: HTMLElement;
  $: change = (value: string) => {
    dispatcher("change", {
      selected: processSelectionChange(
        value,
        selected,
        config.multiple,
        config.required,
        config.options && config.options.length > 0
      ),
    });
  };
  $: options = buildOptions(selected, config);
  $: keyMap = (
    options
      ? options.reduce((map, o, i) => {
          return o.shortcut ? { ...map, [o.shortcut as string]: i } : map;
        }, {})
      : {}
  ) as { [key: string]: number };
  const reset = () => {
    // When we're in freeform-only mode (no options),
    // the clean version of the field should contain the
    // current label.
    if (!options && !freeform.dirty && config.freeform) {
      freeform = {
        dirty: false,
        value: selected && selected.length > 0 ? selected[0] : "",
      };
    }
  };
  $: options, freeform, config, selected, reset();
  $: createOptionCallback = (value: string) => () => change(value);
  $: keydown = (event: KeyboardEvent) => {
    if (
      !event.ctrlKey &&
      !event.shiftKey &&
      keyMap &&
      keyMap.hasOwnProperty(event.key) &&
      elementIsFocused(element, event.target)
    ) {
      const idx = keyMap[event.key];
      simulateClick(
        element.querySelector(
          `.input-target[data-index='${idx}']`
        ) as HTMLElement
      ).then(() => focus(element));
      event.preventDefault();
      event.stopPropagation();
    }
  };
  $: freeformEffects = {
    modify: () => {
      freeform = { ...freeform, dirty: true };
    },
    blur: () => {
      if (!options) {
        change(freeform.value);
        freeform = { ...freeform, dirty: false };
      } else {
        freeform = { value: "", dirty: false };
      }
    },
    submit: (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      change(freeform.value);
      focus(element);
      freeform = { ...freeform, dirty: false };
    },
  };
</script>

<svelte:window on:keydown={keydown} />
<div bind:this={element} class="label-panel-entry">
  <div class="label-panel-entry-title">
    <span
      >{config.displayName || config.name}
      {shortcut ? `(${shortcut})` : ""}</span
    >
    {#if config.required && !config.hiderequired}
      <span><sup>*</sup></span>
    {/if}
    {#if editableConfig}
      <IconButton on:click={() => dispatcher("editConfig")}><Edit /></IconButton
      >
    {/if}
  </div>
  <div
    class="label-panel-entry-values"
    style="flex-direction: {config.layout || 'column'};"
  >
    {#if options}
      {#each options as option, optionIndex}
        <label>
          <input
            {disabled}
            class="input-target"
            data-index={optionIndex}
            type={config.multiple ? "checkbox" : "radio"}
            checked={option.selected}
            on:click={createOptionCallback(option.name)}
            value={option.name}
          />
          {option.label}</label
        >
      {/each}
    {/if}
    {#if config.freeform}
      {#if options || config.freeformtag === "input"}
        <input
          {disabled}
          placeholder={options ? "Add a new option" : ""}
          bind:value={freeform.value}
          on:blur={freeformEffects.blur}
          on:keydown={(event) =>
            event.key === "Enter"
              ? freeformEffects.submit(event)
              : freeformEffects.modify()}
          class="input-target"
        />
      {:else}
        <textarea
          {disabled}
          bind:value={freeform.value}
          on:blur={freeformEffects.blur}
          on:keydown={(event) =>
            event.key === "Enter"
              ? freeformEffects.submit(event)
              : freeformEffects.modify()}
          class="input-target"
        />
      {/if}
    {/if}
  </div>
</div>

<style>
  .label-panel-entry {
    z-index: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }
  .label-panel-entry-title {
    display: flex;
    align-items: center;
    flex-direction: row;
    column-gap: 5px;
    color: var(--label-color);
    margin: 0.5rem 0;
  }
  .label-panel-entry-values {
    display: flex;
    row-gap: 5px;
    flex-basis: 100%;
    white-space: nowrap;
  }
  .label-panel-entry-values textarea {
    height: 100%;
    width: 100%;
    box-sizing: border-box;
  }
</style>
