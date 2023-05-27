<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { ImageStackTarget, StackContentState } from "../library/types";
  import { project, mat2str } from "../library/geometry";
  import { createContentLoader } from "../library/common";
  export let stack: ImageStackTarget,
    selected = [0],
    element: HTMLImageElement | undefined = undefined;

  const dispatcher = createEventDispatcher();
  $: ({
    callbacks: loadCallbacks,
    state: loadState,
    promise: loadPromise,
  } = createContentLoader({
    targets: stack.images,
    load: async (event, image) => {
      const target = event.currentTarget as HTMLImageElement;
      return {
        size: [
          { x: 0, y: 0 },
          { x: target.naturalWidth, y: 0 },
          { x: target.naturalWidth, y: target.naturalHeight },
          { x: 0, y: target.naturalHeight },
        ]
          .map((point) => project(image!.transform, point))
          .reduce(
            (size, point) => ({
              width: Math.max(size.width, point.x),
              height: Math.max(size.height, point.y),
            }),
            { width: 0, height: 0 }
          ),
        transform: image!.transform,
      };
    },
  }));
  let state: undefined | StackContentState = undefined;
  const load = () => {
    if ($loadState.mediaState) {
      state = {
        size: $loadState.mediaState.states.reduce(
          (prev, { size }) => ({
            width: Math.max(prev.width, size.width),
            height: Math.max(prev.height, size.height),
          }),
          { width: 0, height: 9 }
        ),
        layers: $loadState.mediaState.states,
      };
    } else {
      state = undefined;
    }
    dispatcher("load", state);
  };
  $: loadPromise.then(load);
</script>

<div
  class="stack-container"
  style={`width: ${state ? state.size.width : 0}px; height: ${
    state ? state.size.height : 0
  }px`}
>
  {#each stack.images as image, imagei}
    {#if imagei == selected[0]}
      <img
        class={`stack-image selected`}
        bind:this={element}
        src={image.target}
        style={`transform: ${mat2str(image.transform)}`}
        alt={image.alt || `image ${imagei}`}
      />
    {/if}
  {/each}
  {#each stack.images as image, imagei}
    <img
      class={`stack-image unselected`}
      src={image.target}
      on:load={loadCallbacks[imagei].load}
      on:error={loadCallbacks[imagei].error}
      alt={`hidden placeholder image for background loading`}
    />
  {/each}
</div>

<style>
  .stack-container {
    position: relative;
  }
  .stack-image {
    position: absolute;
    display: block;
    transform-origin: top left;
  }
  .stack-image.unselected {
    visibility: hidden;
  }
</style>
