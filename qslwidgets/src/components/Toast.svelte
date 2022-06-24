<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { toast } from "./library/stores";
  import ToastItem from "./ToastItem.svelte";
  const getCss = (theme: { [key: string]: string }) =>
    Object.keys(theme).reduce((a, c) => `${a}${c}:${theme[c]};`, "");
</script>

<ul class="_toastContainer">
  {#each $toast as item (item.id)}
    <li
      class={item.classes.join(" ")}
      in:fly={item.intro}
      out:fade
      animate:flip={{ duration: 200 }}
      style={getCss(item.theme)}
    >
      <ToastItem {item} />
    </li>
  {/each}
</ul>

<style>
  ._toastContainer {
    top: var(--toastContainerTop, 1.5rem);
    right: var(--toastContainerRight, 2rem);
    bottom: var(--toastContainerBottom, auto);
    left: var(--toastContainerLeft, auto);
    position: absolute;
    margin: 0;
    padding: 0;
    list-style-type: none;
    pointer-events: none;
    z-index: var(--toastContainerZIndex, 9999);
  }
</style>
