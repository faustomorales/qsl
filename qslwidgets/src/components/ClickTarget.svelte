<script lang="ts">
  import { focus } from "./library/common";

  let element: HTMLDivElement;
</script>

<div bind:this={element} class="click-target" on:click={() => focus(element)} />

<style>
  .click-target {
    width: 100%;
    height: 100%;
    position: absolute;
  }
</style>
