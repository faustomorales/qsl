<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { focus } from "../library/common";
  import Keyboard from "./icons/Keyboard.svelte";
  import KeyboardDisabled from "./icons/KeyboardDisabled.svelte";

  import { elementIsFocused } from "../library/common";
  let element: HTMLElement;
  let destroy: number;
  let focused: boolean = false;
  onMount(
    () =>
      (destroy = setInterval(
        () => (focused = elementIsFocused(element)),
        100
      ) as unknown as number)
  );
  onDestroy(() => clearInterval(destroy));
  const click = () => focus(element);
</script>

<div bind:this={element}>
  <div class="focus-indicator" on:click={click}>
    {#if focused}
      <Keyboard />
    {:else}
      <KeyboardDisabled />
    {/if}
  </div>
</div>
<div style="width: 0; height: 0; overflow: hidden">
  <div class="focus-target" tabIndex={-1} />
</div>

<style>
  .focus-indicator {
    width: 48px;
    height: 48px;
  }
  .focus-indicator :global(svg) {
    fill: var(--label-color);
  }
</style>
