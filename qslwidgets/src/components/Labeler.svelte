<script lang="ts">
  import Toast from "./Toast.svelte";
  import ProgressBar from "./ProgressBar.svelte";
  import ClickTarget from "./ClickTarget.svelte";
  import { createStores } from "../library/instanceStores.js";
  import { setContext } from "svelte";

  export let progress: number | undefined = undefined,
    mode: "dark" | "light" = "light",
    stores = createStores();
  setContext("sharedStores", stores);
  let { enhancements } = stores;
</script>

<div
  class="qslwidgets-labeler"
  style="
  --label-color: {mode === 'dark' ? '#fff' : '#666'};
  --border-color: {mode === 'dark' ? '#fff' : '#000'};
  --background-color:  {mode === 'dark' ? '#333' : '#fff'};
  --text-color: {mode === 'dark' ? '#fff' : '#000'};
  --disabled-color: {mode === 'dark' ? '#666' : '#ddd'};
  --image-enhancements-filter: contrast({$enhancements.contrast}) brightness({$enhancements.brightness}) saturate({$enhancements.saturation});
"
>
  <ClickTarget />
  <Toast />
  {#if progress !== undefined}
    <ProgressBar {progress} />
  {/if}
  <slot />
</div>

<style>
  .qslwidgets-labeler {
    position: relative;
    display: flex;
    flex-direction: column;
    row-gap: 10px;
    padding: 16px;
    border-radius: 16px;
  }
  .qslwidgets-labeler,
  .qslwidgets-labeler :global(textarea),
  .qslwidgets-labeler :global(input),
  .qslwidgets-labeler :global(span) {
    --color1: #676778;
    --color2: #40b3ff;
    --color3: #ff3e00;
    background-color: var(--background-color);
    color: var(--text-color);
    font-family: Roboto, Helvetica, Arial, sans-serif;
  }
  .qslwidgets-labeler :global(textarea),
  .qslwidgets-labeler :global(input) {
    padding: 8px;
    border-radius: 16px;
    resize: none;
  }
</style>
