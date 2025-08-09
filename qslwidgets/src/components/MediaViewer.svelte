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
    viewHeight: number | null = 384,
    fixedHeight: boolean = true,
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
    rotation: 0,
    top: 0, // top and left are used to position the image after rotation
    left: 0, // top and left are used to position the image after rotation
    fit: 1,
    recentReset: false,
    dragging: false,
  };
  let syncRequired = true;
  const fitCheck = () => {
    // If we go to a fit size and weren't at one before,
    // reset the viewport to a neutral position.
    if (state.zoom == state.fit && !state.recentReset) {
      state = { ...state, zoom: state.fit, x: 0, y: 0, recentReset: true };
    } else if (state.zoom != state.fit) {
      state = { ...state, recentReset: false };
    }
  };
  $: state.zoom, fitCheck();
  const rotationCheck = () => {
    let { size } = state.basis;
    let height: number = (size.height || 0) * state.zoom;
    let width: number = (size.width || 0) * state.zoom;
    let angle: number = Math.ceil(state.rotation / 90) * 90 || 0; // snap to 90 degree increments
    let left: number = 0,
      top: number = 0;

    if (angle == 90) {
      left = height;
    } else if (angle == 180) {
      left = width;
      top = height;
    } else if (angle == 270) {
      top = width;
    }
    state = { ...state, rotation: angle, left: left, top: top };
  };
  $: state.rotation, rotationCheck();
  const sync = () => {
    if (!size || !viewWidth) {
      syncRequired = true;
      return;
    }
    if (
      viewWidth !== state.basis.view.width ||
      (viewHeight !== null && viewHeight !== state.basis.view.height) ||
      state.basis.size.width !== size.width ||
      state.basis.size.height !== size.height
    ) {
      syncRequired = true;
      const minimapScale = minimapSize / Math.max(size.width, size.height);
      const fit = Math.min(
        (viewHeight || size.height) / size.height,
        viewWidth / size.width,
      );

      state = {
        ...state,
        x: 0,
        y: 0,
        basis: {
          view: {
            width: viewWidth,
            height: viewHeight || size.height,
          },
          size: size!,
        },
        minimap: {
          width: size.width * minimapScale,
          height: size.height * minimapScale,
          scale: minimapScale,
        },
        zoom: fit,
        rotation: 0,
        fit,
      };
    }
    syncRequired = false;
  };
  $: size, viewWidth, state.rotation, sync();
  const zoom2span = (zoom: number) =>
    state.basis.view.width && state.basis.size.width && state.basis.size.height
      ? {
          width: Math.min(
            state.basis.view.width / (zoom * state.basis.size.width),
            1,
          ),
          height: Math.min(
            state.basis.view.height / (zoom * state.basis.size.height),
            1,
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
      y: viewHeight
        ? Math.min(Math.max(point.y - span.height / 2, 0), 1 - span.height)
        : 0,
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
      const next = {
        x: Math.max(state.x - operation.deltaX / (state.zoom * size.width), 0),
        y: viewHeight
          ? Math.max(state.y - operation.deltaY / (state.zoom * size.height), 0)
          : 0,
      };
      state = {
        ...state,
        zoom: state.zoom,
        ...next,
      };
    } else {
      const zoom = Math.max(
        state.zoom - operation.deltaY / (2 * 100),
        10 / Math.min(size.width, size.height),
      );
      const spani = zoom2span(state.zoom);
      const spanf = zoom2span(zoom);
      const center = operation.center || { x: state.x, y: state.y };
      const relative = {
        x: (center.x - state.x) / spani.width,
        y: viewHeight ? (center.y - state.y) / spani.height : 0,
      };
      const next = {
        x: Math.max(center.x - relative.x * spanf.width, 0),
        y: viewHeight ? Math.max(center.y - relative.y * spanf.height, 0) : 0,
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
        onDrag: (event: any) => {
          onMediaScroll({
            deltaX: event.delta[0],
            deltaY: event.delta[1],
            ctrlKey: false,
          });
        },
        onDragStart: () => {
          state = { ...state, dragging: true };
        },
        onWheel: (detail: any) => {
          // Make this computation about whether there
          // is more to scroll horizontally/vertically.
          // So if the viewport already covers the full image
          // in that direction, don't prevent default behavior!
          // https://github.com/pmndrs/use-gesture/blob/97765d604372e5190002df1f64da649deea3faa6/documentation/pages/docs/options.mdx#L107
          if (Math.abs(detail.delta[0]) > 1 || viewHeight) {
            detail.event.preventDefault();
            detail.event.stopPropagation();
          }
          onMediaScroll({
            deltaX: detail.ctrlKey ? detail.delta[0] : -detail.delta[0],
            deltaY: detail.ctrlKey ? detail.delta[1] : -detail.delta[1],
            ctrlKey: detail.ctrlKey,
            center: convertCoordinates(
              {
                x: detail.event.pageX,
                y: detail.event.pageY,
              },
              main,
            ),
          });
          cleanup();
        },
        onPinch: (event: any) => {
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
                main,
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
          preventDefault: false,
          eventOptions: {
            passive: false,
          },
        },
      },
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
  style="--media-viewer-scale: {state.zoom}; --media-viewer-rotation: {state.rotation}; --media-viewer-x: {100 *
    state.x}%; --media-viewer-y: {100 *
    state.y}%; --media-viewer-minimap-scale: {state.minimap
    .scale}; --media-viewer-minimap-width: {state.minimap
    .width}; --media-viewer-minimap-height: {state.minimap.height};
    --media-viewer-minimap-limit-width: {Math.min(
    1 - state.x,
    state.basis.view.width && state.basis.size.width
      ? state.basis.view.width / (state.basis.size.width * state.zoom)
      : 0,
  ) * 100}%; --media-viewer-minimap-limit-height: {Math.min(
    1 - state.y,
    state.basis.view.height && state.basis.size.height
      ? viewHeight
        ? state.basis.view.height / (state.basis.size.height * state.zoom)
        : 1 - state.y
      : 0,
  ) * 100}%; --media-viewer-top: {state.top}; --media-viewer-left: {state.left}
    "
  class="media-viewer {state.dragging ? 'dragging' : ''} {syncRequired
    ? 'sync-required'
    : ''}"
>
  <div
    bind:this={view}
    class="viewport"
    style="height: {viewHeight || !state.basis.size.height
      ? viewHeight && state.basis.size.height && !fixedHeight
        ? Math.min(viewHeight, state.basis.size.height * state.zoom)
        : state.basis.view.height
      : (1 - state.y) * (state.basis.size.height * state.zoom)}px; width: 100%"
  >
    <ClickTarget />
    <div class="main {loadState}" bind:this={main}>
      <slot name="main" />
      <slot name="regions" />
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
            marks={Math.abs(state.fit - 1) > 0.5
              ? [
                  { value: 1, label: "1" },
                  { value: state.fit, label: "Fit" },
                ]
              : [{ value: state.fit, label: "Fit" }]}
          />
          <RangeSlider
            name="Rotation"
            disabled={false}
            min={0}
            max={270}
            bind:value={state.rotation}
            marks={[
              { value: 0 },
              { value: 90 },
              { value: 180 },
              { value: 270 },
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
  .hidden {
    visibility: hidden;
  }
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
      )
      rotate(calc(1deg * var(--media-viewer-rotation)));
    transform-origin: 0 0;
    position: absolute;
    top: calc(1px * var(--media-viewer-top));
    left: calc(1px * var(--media-viewer-left));
    touch-action: none;
  }
  .sync-required .main,
  .sync-required .minimap,
  .main.loading,
  .main.error {
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
