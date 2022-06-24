<script lang="ts">
  import { ArbitraryMetadata } from "./library/types";
  export let metadata: ArbitraryMetadata | undefined = {};
</script>

{#if metadata && Object.keys(metadata).length > 0}
  <table tabindex="0" class="metadata">
    {#each Object.entries(metadata) as [key, value]}
      <tr>
        <td>{key}</td>
        <td>{value}</td>
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
  }
  td:first-of-type {
    text-align: right;
    font-weight: bold;
  }
  td:last-of-type {
    text-align: left;
  }
</style>
