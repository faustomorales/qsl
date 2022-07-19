<script lang="ts">
  import type { ArbitraryMetadata } from "../library/types";
  export let metadata: ArbitraryMetadata | undefined = {};
</script>

{#if metadata && Object.keys(metadata).length > 0}
  <table tabindex="0" class="metadata">
    {#each Object.entries(metadata) as [key, value]}
      <tr>
        <td class="key">{key}</td>
        <td class="value">{value}</td>
      </tr>
    {/each}
  </table>
{/if}

<style>
  table {
    width: 100%;
    border: 1px solid;
    border-color: var(--border-color);
  }
  td {
    padding: 10px;
    width: 50%;
  }
  td.key {
    text-align: right;
    font-weight: bold;
    padding-right: 5px;
  }
  td.value {
    text-align: left;
    padding-left: 5px;
  }
</style>
