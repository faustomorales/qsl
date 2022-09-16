<script lang="ts">
  import type { ArbitraryMetadata } from "../library/types";
  export let metadata: ArbitraryMetadata | undefined = {};
</script>

{#if metadata && Object.keys(metadata).length > 0}
  <div tabindex="0" class="metadata">
    {#each Object.entries(metadata) as [key, value]}
      <div class="entry">
        <span class="key">{key}</span>
        <span class="value">{value}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .metadata {
    border-color: var(--border-color);
    display: flex;
    flex-wrap: wrap;
    position: relative;
  }
  .entry {
    padding: 10px;
    display: flex;
    flex-direction: row;
  }
  .key {
    text-align: right;
    font-weight: bold;
    padding-right: 5px;
  }
  .value {
    text-align: left;
    padding-left: 5px;
    word-break: break-all;
  }
</style>
