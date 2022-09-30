<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  export let itemSize: number = 256,
    itemGap: number = 10;
  let container: HTMLDivElement,
    intervalId: number,
    containerWidth: number,
    styling: HTMLStyleElement;
  onMount(() => {
    styling = document.createElement("style");
    document.head.appendChild(styling);
    intervalId = setInterval(() => {
      if (container.clientWidth !== containerWidth) {
        containerWidth = container.clientWidth;
      }
    }, 10) as unknown as number;
  });
  onDestroy(() => {
    clearInterval(intervalId);
    document.head.removeChild(styling);
  });
  const alphabet = Array.from(Array(26))
    .map((e, i) => i + 65)
    .map((x) => String.fromCharCode(x));
  const id = Array.from(Array(16)).reduce(
    (memo) => memo + alphabet[Math.floor(Math.random() * alphabet.length)],
    ""
  );
  const reflow = () => {
    if (!styling || !container) {
      // We called reflow before the columns finished rendering. Just give it a minute.
      setTimeout(reflow, 10);
    } else {
      let innerHTML = "";
      for (var index = 0; index < columns; index++) {
        innerHTML += `
        #${id} .column:nth-child(${
          index + 1
        }) > *:not(:nth-child(${columns}n + ${index + 1})) {
          display: none;
        }`;
      }
      styling.innerHTML = innerHTML;
    }
  };
  $: columns = containerWidth
    ? Math.max(Math.floor(containerWidth / (itemGap + itemSize)), 1)
    : 1;
  $: columns, reflow();
</script>

<div
  {id}
  class="container"
  bind:this={container}
  on:click
  style="--item-size: {itemSize}; --item-gap: {itemGap};"
>
  {#each Array(columns) as _}
    <div class="column {!containerWidth ? 'hidden' : ''}" on:click>
      <slot />
    </div>
  {/each}
</div>

<style>
  .container {
    position: relative;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    column-gap: calc(var(--item-gap) * 1px);
  }
  .hidden {
    visibility: hidden;
  }
  .column {
    display: flex;
    flex-direction: column;
    width: calc(var(--item-size) * 1px);
    row-gap: calc(var(--item-gap) * 1px);
  }
</style>
