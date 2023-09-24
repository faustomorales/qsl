<!-- svelte-ignore a11y-media-has-caption -->
<script lang="ts">
  import type {
    TimestampedLabelWithMatch,
    VideoSegmentTarget,
    WidgetActions,
    Config,
    TimestampedLabel,
    TimestampInfoWithMatch,
    ArbitraryMetadata,
  } from "../library/types";
  import { createEventDispatcher } from "svelte";
  import { createDraftStore } from "../library/common";
  import Metadata from "./Metadata.svelte";
  import LabelPanelEntry from "./LabelPanelEntry.svelte";
  import ControlMenu from "./ControlMenu.svelte";
  import VideoPair from "./VideoPair.svelte";
  import ButtonGroup from "./ButtonGroup.svelte";

  export let target: VideoSegmentTarget | undefined,
    transitioning: boolean = false,
    metadata: ArbitraryMetadata | undefined = undefined,
    editableConfig: boolean = false,
    labels: (TimestampedLabelWithMatch | TimestampedLabel)[] | undefined,
    config: Config,
    navigation: boolean = false,
    actions: WidgetActions = {};
  const dispatcher = createEventDispatcher();
  let { draft, history } = createDraftStore();
  const format = (value: number) => (Math.round(value * 1e2) / 1e2).toString();
  const labelToString = (label: TimestampedLabelWithMatch) =>
    `${format(label.timestamp)} to ${format(label.end)} and ${format(
      label.match.timestamp
    )} to ${format(label.match.end)}`;
  let selected = labels && labels.length > 0 ? 0 : null;
  let mediaStates: {
    video1: { duration: number } | null;
    video2: { duration: number } | null;
  } = {
    video1: null,
    video2: null,
  };
  let playbackState = {
    video1: {
      paused: true,
      playhead: selected !== null && labels ? labels[selected].timestamp : 0,
    },
    video2: {
      paused: true,
      playhead:
        selected && labels && labels[selected]
          ? (labels[selected] as TimestampedLabelWithMatch).match?.timestamp ||
            0
          : 0,
    },
  };
  const reset = () => {
    if (labels && selected !== null) {
      const current = labels[selected];
      draft.reset(current.labels, {
        timestamp: current.timestamp,
        end: current.end,
        match: (current as TimestampedLabelWithMatch)?.match || {
          timestamp: 0,
          end: mediaStates.video2?.duration,
        },
      });
    } else {
      draft.reset(
        {},
        mediaStates.video1 && mediaStates.video2
          ? {
              timestamp: 0,
              end: mediaStates.video1.duration,
              match: {
                timestamp: 0,
                end: mediaStates.video2.duration,
              },
            }
          : undefined
      );
    }
  };
  const changeSelected = (event: { detail: { selected: string[] } }) => {
    selected =
      event.detail.selected && event.detail.selected.length > 0
        ? parseInt(event.detail.selected[0])
        : null;
    reset();
  };
  const save = () => {
    if (
      playbackState.video1.paused &&
      playbackState.video2.paused &&
      labels &&
      selected !== null
    ) {
      labels[selected] = {
        labels: { ...draft.export() },
        ...($draft.timestampInfo as TimestampInfoWithMatch),
      };
      dispatcher("save");
    } else {
      console.error("Attempted to save while playing or t1 was undefined.");
    }
  };
  $: labels, reset();
  $: mediaStates, reset();
  $: controlConfig = {
    name: "Segment Pair",
    multiple: false,
    freeform: false,
    options: (labels || []).map((l, i) => ({
      name: i.toString(),
      displayName: labelToString(l as TimestampedLabelWithMatch),
    })),
  };
</script>

<div>
  {#if target}
    <VideoPair
      {target}
      bind:draft={$draft}
      {playbackState}
      on:change={draft.snapshot}
      on:loaded-video1={(event) =>
        (mediaStates = {
          ...mediaStates,
          video1: { duration: event.detail.duration },
        })}
      on:loaded-video2={(event) =>
        (mediaStates = {
          ...mediaStates,
          video2: { duration: event.detail.duration },
        })}
    />
    <Metadata {metadata} />
  {/if}
  {#if labels && labels.length > 0}
    <LabelPanelEntry
      config={controlConfig}
      disabled={false}
      selected={selected !== null ? [selected.toString()] : []}
      on:change={changeSelected}
      editableConfig={false}
    />
  {:else}
    <p>
      There are no pair labels for this video pair. Please add a new pair using
      the "Add" button.
    </p>
  {/if}
  <div class="add-delete-controls">
    <ButtonGroup
      configs={[
        {
          text: "Add",
          event: "add",
          shortcuts: [],
          tooltip: "Add a new pair label.",
          disabled: $draft.dirty,
        },
        {
          text: "Delete",
          event: "delete",
          shortcuts: [],
          tooltip: "Delete a pair label.",
          disabled: $draft.dirty || !labels || labels.length == 0,
        },
      ]}
      on:click={(event) => {
        if (
          event.detail.name == "add" &&
          mediaStates.video1 &&
          mediaStates.video2
        ) {
          labels = [
            ...(labels || []),
            {
              labels: {},
              timestamp: 0,
              end: mediaStates.video1.duration,
              match: {
                timestamp: 0,
                end: mediaStates.video2.duration,
              },
            },
          ];
          selected = labels.length - 1;
        } else if (
          event.detail.name == "delete" &&
          labels &&
          selected !== null &&
          labels.length > selected
        ) {
          labels = labels.slice(0, selected).concat(labels.slice(selected + 1));
          selected = labels.length > 0 ? Math.max(selected - 1, 0) : null;
        }
      }}
    />
  </div>
  <ControlMenu
    bind:config
    bind:draft={$draft}
    on:change={draft.snapshot}
    on:next
    on:prev
    on:delete
    on:ignore
    on:unignore
    on:showIndex
    on:undo={() => history.undo()}
    on:save={save}
    on:reset={reset}
    disabled={transitioning}
    {editableConfig}
    {navigation}
    actions={{ ...actions, undo: $history > 0 }}
  />
</div>

<style>
  .add-delete-controls {
    margin-top: 5px;
  }
</style>
