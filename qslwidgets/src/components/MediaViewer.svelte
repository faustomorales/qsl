<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Dimensions, Point, MediaLoadState } from "../library/types";
  import { convertCoordinates } from "../library/geometry";
  import { focus } from "../library/common";
  import RangeSlider from "./RangeSlider.svelte";
  import ClickTarget from "./ClickTarget.svelte";
  import EnhancementControls from "./EnhancementControls.svelte";
  import Spinner from "./Spinner.svelte";
  import * as useGesture from "@use-gesture/vanilla";
  export let size: Dimensions | undefined,
    viewHeight: number = 384,
    loadState: MediaLoadState = "loaded",
    enhancementControls: boolean = true;
  let main: HTMLDivElement;
  let view: HTMLDivElement;
  let mini: HTMLDivElement;
  let viewWidth: number | undefined = undefined;
  let destroy: () => void;
  const cleanup = () => focus(main);
  const defaultBasis = {
    view: {
      width: undefined as number | undefined,
      height: viewHeight as number,
    },
    size: {
      width: undefined as number | undefined,
      height: undefined as number | undefined,
    },
  };
  const minimapSize = 96;

  $: state = {
    basis: defaultBasis,
    minimap: { width: minimapSize, height: minimapSize, scale: 1 },
    x: 0,
    y: 0,
    zoom: 1,
    fit: 1,
    dragging: false,
  };
  $: if (
    size &&
    viewWidth &&
    (viewWidth !== state.basis.view.width ||
      viewHeight !== state.basis.view.height ||
      state.basis.size.width !== size.width ||
      state.basis.size.height !== size.height)
  ) {
    state = (() => {
      const minimapScale = minimapSize / Math.max(size.width, size.height);
      const fit = Math.min(viewHeight / size.height, viewWidth / size.width);
      return {
        ...state,
        x: 0,
        y: 0,
        basis: {
          view: { width: viewWidth, height: viewHeight },
          size,
        },
        minimap: {
          width: size.width * minimapScale,
          height: size.height * minimapScale,
          scale: minimapScale,
        },
        zoom: fit,
        fit,
      };
    })();
  }
  const zoom2span = (zoom: number) =>
    state.basis.view.width && state.basis.size.width && state.basis.size.height
      ? {
          width: Math.min(
            state.basis.view.width / (zoom * state.basis.size.width),
            1
          ),
          height: Math.min(
            state.basis.view.height / (zoom * state.basis.size.height),
            1
          ),
        }
      : { width: 0, height: 0 };
  $: onMinimapClick = (event: MouseEvent) => {
    if (
      !state.basis.view.width ||
      !state.basis.view.height ||
      !state.basis.size.width ||
      !state.basis.size.height
    )
      return;
    const point = convertCoordinates({ x: event.pageX, y: event.pageY }, mini);
    const span = zoom2span(state.zoom);
    state = {
      ...state,
      x: Math.min(Math.max(point.x - span.width / 2, 0), 1 - span.width),
      y: Math.min(Math.max(point.y - span.height / 2, 0), 1 - span.height),
    };
  };
  $: onMediaScroll = (operation: {
    deltaX: number;
    deltaY: number;
    ctrlKey: boolean;
    center?: Point;
  }) => {
    if (!size) {
      return;
    }
    if (!operation.ctrlKey) {
      state = {
        ...state,
        zoom: state.zoom,
        x: Math.max(state.x - operation.deltaX / (state.zoom * size.width), 0),
        y: Math.max(state.y - operation.deltaY / (state.zoom * size.height), 0),
      };
    } else {
      const zoom = Math.max(
        state.zoom - operation.deltaY / (2 * 100),
        10 / Math.min(size.width, size.height)
      );
      const spani = zoom2span(state.zoom);
      const spanf = zoom2span(zoom);
      const center = operation.center || { x: state.x, y: state.y };
      const relative = {
        x: (center.x - state.x) / spani.width,
        y: (center.y - state.y) / spani.height,
      };
      const next = {
        x: Math.max(center.x - relative.x * spanf.width, 0),
        y: Math.max(center.y - relative.y * spanf.height, 0),
      };
      state = {
        ...state,
        ...next,
        zoom,
      };
    }
  };
  onMount(() => {
    const gestures = new useGesture.Gesture(
      main,
      {
        onDragEnd: () => {
          setTimeout(() => (state = { ...state, dragging: false }), 100);
          cleanup();
        },
        onDrag: ({ delta: [deltaX, deltaY] }) => {
          onMediaScroll({
            deltaX,
            deltaY,
            ctrlKey: false,
          });
        },
        onDragStart: () => {
          state = { ...state, dragging: true };
        },
        onWheel: ({
          delta: [deltaX, deltaY],
          ctrlKey,
          event: { pageX, pageY },
        }) => {
          onMediaScroll({
            deltaX: ctrlKey ? deltaX : -deltaX,
            deltaY: ctrlKey ? deltaY : -deltaY,
            ctrlKey,
            center: convertCoordinates(
              {
                x: pageX,
                y: pageY,
              },
              main
            ),
          });
          cleanup();
        },
        onPinch: (event) => {
          if (event.memo && event.memo > 0 && size) {
            onMediaScroll({
              deltaX: 0,
              deltaY: event.memo - event.da[0],
              ctrlKey: true,
              center: convertCoordinates(
                {
                  x: event.origin[0] + window.scrollX,
                  y: event.origin[1] + window.scrollY,
                },
                main
              ),
            });
          }
          cleanup();
          return event.last ? -1 : event.da[0];
        },
      },
      {
        drag: {
          delay: 500,
        },
        wheel: {
          preventDefault: true,
          eventOptions: {
            passive: false,
          },
        },
      }
    );
    const intervalId = setInterval(() => {
      if (viewWidth !== view.clientWidth) {
        viewWidth = view.clientWidth;
      }
    }, 100);
    destroy = () => {
      gestures.destroy();
      clearInterval(intervalId);
    };
  });
  onDestroy(() => destroy());
</script>

<div
  style="--media-viewer-scale: {state.zoom}; --media-viewer-x: {100 *
    state.x}%; --media-viewer-y: {100 *
    state.y}%; --media-viewer-minimap-scale: {state.minimap
    .scale}; --media-viewer-minimap-width: {state.minimap
    .width}; --media-viewer-minimap-height: {state.minimap.height};
    --media-viewer-minimap-limit-width: {Math.min(
    1 - state.x,
    state.basis.view.width && state.basis.size.width
      ? state.basis.view.width / (state.basis.size.width * state.zoom)
      : 0
  ) * 100}%; --media-viewer-minimap-limit-height: {Math.min(
    1 - state.y,
    state.basis.view.height && state.basis.size.height
      ? state.basis.view.height / (state.basis.size.height * state.zoom)
      : 0
  ) * 100}%;
    "
  class="media-viewer {state.dragging ? 'dragging' : ''}"
>
  <div
    bind:this={view}
    class="viewport"
    style="height: {state.basis.view.height}px; width: 100%"
  >
    <ClickTarget />
    <div class="main" bind:this={main}>
      <div class={loadState}>
        <slot name="main" />
      </div>
      {#if loadState === "loaded"}
        <slot name="regions" />
      {/if}
    </div>
    {#if loadState !== "loaded"}
      <div class="spinner">
        <Spinner />
      </div>
    {/if}
  </div>
  <div class="footer">
    <div class="minimap" bind:this={mini}>
      {#if loadState === "loaded"}
        <div class="image">
          <slot name="mini" />
        </div>
        <slot name="regions" />
        <div class="limits" />
        <div class="click-target" on:click={onMinimapClick} />
      {/if}
    </div>
    <div class="controls">
      <slot name="custom-controls" />
      {#if enhancementControls}
        <EnhancementControls>
          <RangeSlider
            name="Zoom"
            disabled={false}
            min={0.1}
            max={10}
            bind:value={state.zoom}
            marks={[
              { value: 1, label: "1" },
              { value: state.fit, label: "Fit" },
            ]}
          />
        </EnhancementControls>
      {:else}
        <RangeSlider
          name="Zoom"
          disabled={false}
          min={0.1}
          max={10}
          bind:value={state.zoom}
          marks={[
            { value: 1, label: "1" },
            { value: state.fit, label: "Fit" },
          ]}
        />
      {/if}
    </div>
  </div>
</div>

<style>
  .media-viewer {
    display: flex;
    flex-direction: column;
    row-gap: 10px;
    z-index: 1;
  }
  .viewport {
    position: relative;
    overflow: hidden;
  }
  .main {
    transform: scale(var(--media-viewer-scale))
      translate(
        calc(-1 * var(--media-viewer-x)),
        calc(-1 * var(--media-viewer-y))
      );
    transform-origin: 0 0;
    position: absolute;
    touch-action: none;
  }
  .main .loading {
    visibility: hidden;
  }
  .footer {
    display: flex;
    flex-direction: row;
    align-items: center;
    column-gap: 10px;
  }
  .controls {
    flex: 100% 0 1;
  }
  .minimap {
    --media-viewer-scale: scale(
      var(--media-viewer-minimap-scale) / var(--media-viewer-scale)
    );
    width: calc(var(--media-viewer-minimap-width) * 1px);
    height: calc(var(--media-viewer-minimap-height) * 1px);
    position: relative;
    box-shadow: 4px 4px 8px rgb(0, 0, 0, 0.5);
    background-color: var(--background-color);
  }
  .minimap .image {
    transform: scale(var(--media-viewer-minimap-scale));
    transform-origin: 0 0;
  }
  .minimap .limits {
    position: absolute;
    border: 1px solid red;
    box-sizing: border-box;
    left: var(--media-viewer-x);
    top: var(--media-viewer-y);
    width: var(--media-viewer-minimap-limit-width);
    height: var(--media-viewer-minimap-limit-height);
  }

  .minimap :global(.mask-cursor) {
    display: none;
  }

  .minimap .click-target {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2;
  }
  .main :global(img),
  .main :global(video),
  .minimap :global(img),
  .minimap :global(video) {
    pointer-events: none;
    image-rendering: pixelated;
    vertical-align: bottom;
    -webkit-user-drag: none;
    -khtml-user-drag: none;
    -moz-user-drag: none;
    -o-user-drag: none;
    -moz-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  .minimap :global(text) {
    display: none;
  }

  .media-viewer.dragging {
    cursor: grab;
  }
  .spinner > :global(:first-child) {
    --colorInner: var(--color1);
    --colorCenter: var(--color2);
    --colorOuter: var(--color3);
    position: absolute;
    left: 50%;
    top: 50%;
    right: 50%;
    bottom: 50%;
  }
  .main :global(img),
  .main :global(video) {
    filter: var(--image-enhancements-filter);
  }
</style>
