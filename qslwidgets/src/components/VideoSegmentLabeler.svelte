<!-- svelte-ignore a11y-media-has-caption -->
<script lang="ts">
  import type {
    TimestampedLabelWithMatch,
    VideoSegmentTarget,
    WidgetActions,
    Config,
    TimestampInfoWithMatch,
  } from "../library/types";
  import { createEventDispatcher } from "svelte";
  import { createDraftStore } from "../library/common";
  import LabelPanelEntry from "./LabelPanelEntry.svelte";
  import ControlMenu from "./ControlMenu.svelte";
  import VideoPair from "./VideoPair.svelte";

  export let target: VideoSegmentTarget | undefined,
    labels: TimestampedLabelWithMatch[] | undefined,
    config: Config,
    navigation: boolean = false,
    actions: WidgetActions = {};
  const dispatcher = createEventDispatcher();
  let { draft, history } = createDraftStore();
  const labelToString = (label: TimestampedLabelWithMatch) =>
    `${label.timestamp} to ${label.end} and ${label.match.timestamp} to ${label.match.end}`;
  let selected = labels && labels.length > 0 ? 0 : null;
  let playbackState = {
    video1: {
      paused: true,
      playhead: selected !== null && labels ? labels[selected].timestamp : 0,
    },
    video2: {
      paused: true,
      playhead:
        selected !== null && labels ? labels[selected].match.timestamp : 0,
    },
  };
  const reset = () => {
    if (labels && selected !== null) {
      const current = labels[selected];
      draft.reset(current.labels, {
        timestamp: current.timestamp,
        end: current.end,
        match: current.match,
      });
    } else {
      draft.reset({}, undefined);
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
</script>

<div>
  {#if target}
    <VideoPair
      {target}
      bind:draft={$draft}
      {playbackState}
      on:change={draft.snapshot}
    />
  {/if}
  {#if labels}
    <LabelPanelEntry
      config={{
        name: "Segment Pair",
        multiple: false,
        freeform: false,
        options: labels.map((l, i) => ({
          name: i.toString(),
          displayName: labelToString(l),
        })),
      }}
      disabled={false}
      selected={selected !== null ? [selected.toString()] : []}
      on:change={changeSelected}
      editableConfig={false}
    />
  {/if}
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
    disabled={false}
    editableConfig={false}
    {navigation}
    actions={{ ...actions, undo: $history > 0 }}
  />
</div>
