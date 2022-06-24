<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { DraftState, Point } from "./library/types";
  import RegionBox from "./RegionBox.svelte";
  import RegionMask from "./RegionMask.svelte";
  import RegionPolygon from "./RegionPolygon.svelte";
  import RegionCursor from "./RegionCursor.svelte";
  export let draft: DraftState,
    cursor: Point | undefined = undefined;
  const dispatcher = createEventDispatcher();
  const onMouseMove = (event: MouseEvent) => dispatcher("mouseMove", { event });
  const createOnClick = (index: number) => (event: MouseEvent) => {
    dispatcher("click", {
      event,
      index,
    });
  };
</script>

<div
  class="inactive-regions {draft.drawing.mode}-mode {draft.drawing.active
    ? 'drawing-active'
    : ''}"
>
  {#each draft.labels.masks as region}
    <RegionMask
      color={region.readonly ? "yellow" : "blue"}
      bitmap={region.map}
    />
  {/each}
  {#each draft.labels.polygons as region, index}
    <RegionPolygon
      color={region.readonly ? "yellow" : "blue"}
      polygon={region}
      on:click={createOnClick(index)}
      on:mousemove={onMouseMove}
    />
  {/each}
  {#each draft.labels.boxes as region, index}
    <RegionBox
      color={region.readonly ? "yellow" : "blue"}
      box={region}
      on:click={createOnClick(index)}
      on:mousemove={onMouseMove}
    />
  {/each}
</div>
<div class="active-region">
  {#if !draft.drawing.active}
    <div />
  {:else if draft.drawing.mode === "polygons"}
    <RegionPolygon
      color="red"
      polygon={draft.drawing.active.region}
      candidate={draft.drawing.active.editable ? cursor : undefined}
    />
  {:else if draft.drawing.mode === "boxes"}
    <RegionBox
      color={"red"}
      box={draft.drawing.active.region}
      candidate={draft.drawing.active.editable ? cursor : undefined}
    />
  {:else if draft.drawing.mode === "masks"}
    <RegionMask color={"red"} bitmap={draft.drawing.active.region.map} />
  {/if}
</div>
{#if draft.drawing.mode === "masks" && cursor}
  <RegionCursor radius={draft.drawing.radius} x={cursor.x} y={cursor.y} />
{/if}

<style>
  :global(.region) {
    position: absolute;
    overflow: visible;
    z-index: 1;
  }

  :global(.region rect),
  :global(.region line) {
    stroke-width: calc(2px / var(--media-viewer-scale, 1));
  }

  :global(.region text) {
    font-size: calc(10pt / var(--media-viewer-scale, 1));
    font-family: Roboto, Helvetica, Arial, sans-serif;
    transform: translate(
      calc(10px / var(--media-viewer-scale, 1)),
      calc(10px / var(--media-viewer-scale, 1))
    );
  }

  .active-region :global(.region),
  .inactive-regions.boxes-mode :global(.polygon),
  .inactive-regions.masks-mode :global(.polygon),
  .inactive-regions.polygons-mode :global(.box),
  .inactive-regions.masks-mode :global(.box),
  :global(.region.mask),
  .inactive-regions.drawing-active :global(.region) {
    pointer-events: none;
  }
</style>
