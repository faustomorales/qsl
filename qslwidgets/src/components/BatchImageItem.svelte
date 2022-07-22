<script lang="ts">
  import type { ArbitraryMetadata } from "../library/types";
  import Metadata from "./Metadata.svelte";
  import IconButton from "./IconButton.svelte";
  import Labeled from "./icons/Labeled.svelte";
  import Ignored from "./icons/Ignored.svelte";
  import Checked from "./icons/Checked.svelte";
  import Unchecked from "./icons/Unchecked.svelte";
  export let src: string | undefined,
    size: number,
    labeled: boolean | string = false,
    selected: boolean | undefined = undefined,
    ignored: boolean = false,
    metadata: ArbitraryMetadata | undefined = undefined;
  let failed = false;
  $: showActionMenu = labeled || ignored || selected !== undefined;
</script>

<div
  class="item {showActionMenu ? 'with-actions' : 'without-actions'}"
  on:click
  style="--item-size: {size}"
>
  {#if failed}
    <span class="error-message">{src} failed to load.</span>
  {:else if src}
    <img {src} on:error={() => (failed = true)} alt="{src} failed to load." />
  {/if}
  {#if showActionMenu}
    <div class="item-actions">
      <div class="item-actions-container">
        {#if labeled || ignored}
          <IconButton label={typeof labeled === "string" ? labeled : undefined}>
            {#if labeled}
              <Labeled />
            {:else}
              <Ignored />
            {/if}
          </IconButton>
        {/if}
        <div class="item-actions-spacer" />
        <IconButton>
          {#if selected !== undefined}
            {#if selected}
              <Checked />
            {:else}
              <Unchecked />
            {/if}
          {/if}
        </IconButton>
      </div>
    </div>
  {/if}
  <Metadata {metadata} />
</div>

<style>
  .item {
    position: relative;
    overflow: hidden;
    border-radius: 16px;
    width: calc(var(--item-size) * 1px);
    border: 1px solid var(--border-color);
  }
  .item.with-actions {
    padding-top: 32px;
  }
  .item.without-actions {
    padding-top: 0px;
  }
  .item :global(.metadata) {
    border-radius: 0 0 16px 16px;
    border-width: 1px 0 0 0;
  }
  .item-actions {
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
  .item-actions-container {
    padding: 3px 8px;
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
  }
  .item-actions-spacer {
    flex-basis: 100%;
    width: 100%;
  }
  .item img {
    vertical-align: bottom;
    object-fit: contain;
    min-width: calc(var(--item-size) * 1px);
    max-width: calc(var(--item-size) * 1px);
    max-height: calc(var(--item-size) * 2px);
    filter: var(--image-enhancements-filter);
  }

  .error-message {
    padding: 10px;
    display: block;
  }
</style>
