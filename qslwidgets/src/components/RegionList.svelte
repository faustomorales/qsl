<script lang="ts">
  import type {
    Point,
    DrawingState,
    DraftLabels,
    ImageData,
  } from "../library/types";
  import { createEventDispatcher } from "svelte";
  import { getDistance, convertCoordinates, snap } from "../library/geometry";
  import { focus } from "../library/common";
  import { fill, img2hsv, findMaskByPoint } from "../library/masking";
  import RegionBox from "./RegionBox.svelte";
  import RegionMask from "./RegionMask.svelte";
  import RegionPolygon from "./RegionPolygon.svelte";
  import RegionCursor from "./RegionCursor.svelte";
  export let labels: DraftLabels,
    drawing: DrawingState,
    cursor: Point | undefined = undefined,
    target: HTMLImageElement | HTMLVideoElement,
    image: ImageData | null = null,
    maxCanvasSize: number;
  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  const dispatcher = createEventDispatcher();
  const onContainerMouseMove = (event: MouseEvent) =>
    (cursor = convertCoordinates(
      { x: event.pageX, y: event.pageY },
      container
    ));
  const createOnRegionClick = (index: number) => (event: MouseEvent) => {
    event.stopPropagation();
    if (event.altKey) {
      onContainerClick(event);
      return;
    }
    const source = labels[drawing.mode];
    const target = source[index];
    const update = (source.slice(0, index) as any).concat(
      source.slice(index + 1)
    );
    labels = {
      ...labels,
      [drawing.mode]: update,
    };
    drawing = {
      ...drawing,
      active: {
        region: target as any,
        editable: false,
      },
    };
    focus(container);
  };
  const onContainerClick = (event: MouseEvent) => {
    const point = convertCoordinates(
      { x: event.pageX, y: event.pageY },
      container
    );
    if (drawing.active) {
      if (!drawing.active.editable) {
        labels = {
          ...labels,
          [drawing.mode]: [drawing.active.region].concat(labels[drawing.mode]),
        };
        drawing = { ...drawing, active: undefined };
      } else {
        if (drawing.mode === "boxes") {
          // Adding to a box.
          dispatcher("change");
          const d1 = getDistance(point, drawing.active.region.pt1);
          const d2 = drawing.active.region.pt2
            ? getDistance(point, drawing.active.region.pt2)
            : -1;
          drawing = {
            ...drawing,
            active: {
              ...drawing.active,
              region: {
                ...drawing.active.region,
                labels: drawing.active.region.labels,
                pt1: d1 < d2 ? point : drawing.active.region.pt1,
                pt2: d1 < d2 ? drawing.active.region.pt2 : point,
              },
            },
          };
        } else if (drawing.mode === "polygons") {
          // Adding to a polygon.
          dispatcher("change");
          drawing = {
            ...drawing,
            active: {
              ...drawing.active,
              region: {
                ...drawing.active.region,
                points: drawing.active.region.points.concat([
                  snap(
                    point,
                    drawing.active.region,
                    container.getBoundingClientRect()
                  ),
                ]),
              },
            },
          };
        } else if (drawing.mode === "masks") {
          // Adding to a mask.
          dispatcher("change");
          if (!image) {
            image = img2hsv(target, canvas, maxCanvasSize);
          }
          const dimensions = target.getBoundingClientRect();
          drawing = {
            ...drawing,
            mode: "masks",
            active: {
              editable: true,
              region: {
                ...drawing.active.region,
                map: {
                  values: fill(point, image, {
                    previous: drawing.active.region.map,
                    inverse: event.altKey,
                    radius: {
                      dx: drawing.radius / dimensions.width,
                      dy: drawing.radius / dimensions.height,
                    },
                    threshold: drawing.threshold,
                  }),
                  dimensions: {
                    width: image.width,
                    height: image.height,
                  },
                },
              },
            },
          };
        }
      }
    } else if (drawing.mode === "boxes") {
      // Creating a new box.
      dispatcher("change");
      drawing = {
        ...drawing,
        active: {
          editable: true,
          region: {
            pt1: point,
            labels: {},
          },
        },
      };
    } else if (drawing.mode === "polygons") {
      // Creating a new polygon.
      dispatcher("change");
      drawing = {
        ...drawing,
        mode: "polygons",
        active: {
          editable: true,
          region: {
            points: [point],
            editable: true,
            labels: {},
          } as any,
        },
      };
    } else if (drawing.mode === "masks") {
      // Creating a new mask.
      dispatcher("change");
      const index = event.altKey ? -1 : findMaskByPoint(point, labels.masks);
      if (index > -1) {
        return createOnRegionClick(index)(event);
      }
      const dimensions = container.getBoundingClientRect();
      if (!image) {
        image = img2hsv(target, canvas, maxCanvasSize);
      }
      drawing = {
        ...drawing,
        mode: "masks",
        active: {
          editable: true,
          region: {
            labels: {},
            map: {
              values: fill(point, image, {
                previous: undefined,
                inverse: false,
                radius: {
                  dx: drawing.radius / dimensions.width,
                  dy: drawing.radius / dimensions.height,
                },
                threshold: drawing.threshold,
              }),
              dimensions: {
                width: image.width,
                height: image.height,
              },
            },
          },
        },
      };
    }
    focus(container);
  };
</script>

<div
  class="region-list {drawing.mode}-mode {drawing.active ? 'is-drawing' : ''} "
  bind:this={container}
  on:click={onContainerClick}
  on:mousemove={onContainerMouseMove}
  on:mouseleave={() => (cursor = undefined)}
>
  <div class="inactive">
    {#each labels.masks as region}
      <RegionMask
        color={region.readonly ? "yellow" : "blue"}
        bitmap={region.map}
      />
    {/each}
    {#each labels.polygons as region, index}
      <RegionPolygon
        color={region.readonly ? "yellow" : "blue"}
        polygon={region}
        on:click={createOnRegionClick(index)}
      />
    {/each}
    {#each labels.boxes as region, index}
      <RegionBox
        color={region.readonly ? "yellow" : "blue"}
        box={region}
        on:click={createOnRegionClick(index)}
      />
    {/each}
  </div>
  <div class="active">
    {#if !drawing.active}
      <div />
    {:else if drawing.mode === "polygons"}
      <RegionPolygon
        color="red"
        polygon={drawing.active.region}
        candidate={drawing.active.editable && cursor
          ? snap(
              cursor,
              drawing.active.region,
              container.getBoundingClientRect()
            )
          : undefined}
      />
    {:else if drawing.mode === "boxes"}
      <RegionBox
        color={"red"}
        box={drawing.active.region}
        candidate={drawing.active.editable ? cursor : undefined}
      />
    {:else if drawing.mode === "masks"}
      <RegionMask color={"red"} bitmap={drawing.active.region.map} />
    {/if}
  </div>
  {#if drawing.mode === "masks" && cursor}
    <RegionCursor radius={drawing.radius} x={cursor.x} y={cursor.y} />
  {/if}
  {#if !image}
    <canvas style="display: none" bind:this={canvas} />
  {/if}
</div>

<style>
  .region-list {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

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
    transform: translate(
      calc(10px / var(--media-viewer-scale, 1)),
      calc(10px / var(--media-viewer-scale, 1))
    );
  }

  .region-list :global(.region),
  :global(.media-viewer.dragging) .region-list {
    pointer-events: none;
  }

  :global(.media-viewer:not(.dragging)) .region-list.boxes-mode,
  :global(.media-viewer:not(.dragging)) .region-list.polygons-mode {
    cursor: crosshair;
  }

  :global(.media-viewer:not(.dragging)) .region-list.masks-mode {
    cursor: none;
  }

  :global(.media-viewer:not(.dragging))
    .region-list.boxes-mode:not(.is-drawing)
    .inactive
    :global(.box),
  :global(.media-viewer:not(.dragging))
    .region-list.polygons-mode:not(.is-drawing)
    .inactive
    :global(.polygon) {
    pointer-events: auto;
  }
</style>
