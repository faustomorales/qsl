<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { LabelConfig } from "./library/types";
  import {
    buildOptions,
    elementIsFocused,
    simulateClick,
    focus,
  } from "./library/utils";
  import Edit from "carbon-icons-svelte/lib/Edit.svelte";
  import { processSelectionChange } from "./library/handlers";
  export let config: LabelConfig,
    disabled: boolean,
    selected: string[] | undefined,
    editableConfig: boolean;
  const dispatcher = createEventDispatcher();
  let freeform = { value: "", dirty: false };
  let element: HTMLElement;
  $: change = (value: string) =>
    dispatcher("change", {
      selected: processSelectionChange(
        value,
        selected,
        config.multiple,
        config.required
      ),
    });
  $: options = buildOptions(selected, config);
  $: keyMap = (
    options
      ? options.reduce((map, o, i) => {
          return o.shortcut ? { ...map, [o.shortcut as string]: i } : map;
        }, {})
      : {}
  ) as { [key: string]: number };
  $: if (!options && !freeform.dirty && config.freeform && selected) {
    // When we're in freeform-only mode (no options),
    // the clean version of the field should contain the
    // current label.
    freeform = { dirty: false, value: selected[0] || "" };
  }
  $: createOptionCallback = (value: string) => () => change(value);
  $: keyboardEffects = {
    keydown: (event: KeyboardEvent) => {
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
            `.react-image-labeler-input-target[data-index='${idx}']`
          ) as HTMLElement
        ).then(() => focus(element));
        event.preventDefault();
        event.stopPropagation();
      }
    },
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

<svelte:window on:keydown={keyboardEffects.keydown} />
<div bind:this={element} class="label-panel-entry">
  <div class="label-panel-entry-title">
    <span>{config.displayName || config.name} </span>
    {#if config.required && !config.hiderequired}
      <span><sup>*</sup></span>
    {/if}
    {#if editableConfig}
      <button class="icon-button" on:click={() => dispatcher("editConfig")}
        ><Edit /></button
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
            class="react-image-labeler-input-target"
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
          bind:value={freeform.value}
          on:blur={freeformEffects.blur}
          on:keydown={(event) =>
            event.key === "Enter"
              ? freeformEffects.submit(event)
              : freeformEffects.modify()}
          class="react-image-labeler-input-target"
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
          class="react-image-labeler-input-target"
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
    color: rgb(100, 100, 100);
    margin: 0.5rem 0;
  }
  .label-panel-entry-values {
    display: flex;
    row-gap: 5px;
    flex-basis: 100%;
  }
  .icon-button {
    position: relative;
    border-radius: 50%;
    background-color: transparent;
    width: 2rem;
    height: 2rem;
  }
  .icon-button:active {
    background-color: lightgrey;
  }
  .icon-button :global(svg) {
    position: absolute;
    width: 50%;
    height: 50%;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
  .label-panel-entry-values textarea {
    height: 100%;
    width: 100%;
    box-sizing: border-box;
  }
</style>
