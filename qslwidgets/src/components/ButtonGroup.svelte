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
  import Button from "./Button.svelte";
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
      <Button
        {basis}
        tooltip={config.tooltip}
        disabled={config.disabled}
        dataIndex={configIndex}
        text={config.text}
        on:click={() => click(config.event)}
        className={config.class}
        highlighted={config.highlighted}
      />
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
</style>
