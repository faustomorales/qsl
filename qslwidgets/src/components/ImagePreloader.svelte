<script lang="ts">
  export let images: string[];
  let index = 0;
  const reset = () => (index = 0);
  $: images, reset();
</script>

<div class="preloader">
  {#each images as src, srci}
    {#if srci <= index}
      <img {src} alt="Preloaded image {srci}" on:load={() => (index += 1)} />
    {/if}
  {/each}
</div>

<style>
  .preloader {
    width: 0;
    height: 0;
    overflow: hidden;
  }
</style>
