<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { ButtonConfig } from "../library/types";
  import {
    simulateClick,
    elementIsFocused,
    findFocusTarget,
    focus,
    pct2css,
  } from "../library/common";
  export let configs: ButtonConfig[];
  const dispatcher = createEventDispatcher();
  const click = (name: string) => dispatcher("click", { name });
  let container: HTMLElement;
  $: keydown = (event: KeyboardEvent) => {
    if (!container) return;
    if (!elementIsFocused(container, event.target)) return;
    const idx = configs.findIndex(
      (config) =>
        !config.disabled &&
        !config.hidden &&
        config.shortcuts.some(
          (s) =>
            s.key === event.key &&
            event.altKey === !!s.altKey &&
            event.shiftKey === !!s.shiftKey &&
            event.ctrlKey === !!s.ctrlKey
        )
    );
    if (container && idx > -1) {
      event.preventDefault();
      event.stopPropagation();
      const target = container.querySelector(`button[data-index='${idx}']`);

      if (target) {
        const focusTarget = findFocusTarget(container);
        simulateClick(target as HTMLElement).then(() =>
          focus(focusTarget as HTMLElement)
        );
      }
    }
  };
  $: basis = pct2css(
    1 / configs.reduce((count, config) => count + (config.hidden ? 0 : 1), 0)
  );
</script>

<svelte:window on:keydown={keydown} />
<div class="button-group-container" bind:this={container}>
  {#each configs as config, configIndex}
    {#if !config.hidden}
      <button
        style="flex: 0 1 {basis};"
        disabled={config.disabled}
        data-index={configIndex}
        on:click={() => click(config.event)}>{config.text}</button
      >
    {/if}
  {/each}
</div>

<style>
  .button-group-container {
    z-index: 1;
    position: relative;
    white-space: nowrap;
    display: flex;
    flex-direction: row;
  }
  button {
    border-width: 1px 0px 1px 1px;
    border-style: solid;
    border-color: var(--text-color);
    padding: 10px;
    background-color: var(--background-color);
    color: var(--text-color);
    text-transform: uppercase;
  }
  button:disabled {
    background-color: darkgrey;
  }
  button:focus-visible:not(:disabled), button:active:not(:disabled) {
    background-color: var(--color2);
    outline: none;
  }
  button:last-of-type {
    border-top-right-radius: 10px;
    border-bottom-right-radius: 10px;
    border-width: 1px;
  }
  button:first-of-type {
    border-bottom-left-radius: 10px;
    border-top-left-radius: 10px;
  }
</style>
