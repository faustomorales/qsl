<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type {
    Config,
    DraftState,
    LabelConfig,
    LabelData,
    ControlMenuActions,
  } from "./library/types";
  import { shortcutify } from "./library/common";
  import LabelPanel from "./LabelPanel.svelte";
  import ButtonGroup from "./ButtonGroup.svelte";
  import ConfigEditor from "./ConfigEditor.svelte";
  import RangeSlider from "./RangeSlider.svelte";
  import FocusIndicator from "./FocusIndicator.svelte";
  import ClickTarget from "./ClickTarget.svelte";
  export let actions: ControlMenuActions,
    editableConfig: boolean,
    config: Config,
    disabled: boolean,
    navigation: boolean,
    draft: DraftState,
    regions: boolean = true;
  const dispatcher = createEventDispatcher();
  $: action = (event: { detail: { name: string } }) =>
    dispatcher(event.detail.name);

  $: level = draft.drawing.active
    ? "regions"
    : ("image" as "image" | "regions");
  $: state = {
    labels: draft.drawing.active?.region?.labels || draft.labels.image,
    config: shortcutify(config[level] || []),
  };
  $: valid =
    state.config
      .filter((c) => c.required)
      .every((c) => state.labels[c.name]?.length) &&
    (level === "image" ||
      draft.drawing.mode !== "boxes" ||
      (draft.drawing.active?.region.pt1 && draft.drawing.active?.region.pt2));
  let configEditorOptions = {
    open: false,
    existing: undefined,
  } as {
    open: boolean;
    existing?: { config: LabelConfig; level: "image" | "regions" };
  };
  const saveConfig = (event: {
    detail: { config: LabelConfig; level: "image" | "regions" };
  }) => {
    const level = event.detail.level;
    const levelConfig = config[level] || [];
    const index = levelConfig.findIndex(
      (c) => c.name === event.detail.config.name
    );
    const insert = index > -1 ? index : levelConfig.length;
    config = {
      ...config,
      [level]: levelConfig
        .slice(0, insert)
        .concat([event.detail.config])
        .concat(levelConfig.slice(insert + 1)),
    };
  };
  const save = (event: { detail: { labels: LabelData } }) => {
    dispatcher("change");
    if (draft.drawing.active) {
      draft = {
        ...draft,
        dirty: true,
        drawing: {
          ...draft.drawing,
          active: {
            ...draft.drawing.active,
            region: {
              ...(draft.drawing.active.region as any),
              labels: event.detail.labels,
            },
          },
        },
      };
    } else {
      draft = {
        ...draft,
        dirty: true,
        labels: {
          ...draft.labels,
          image: event.detail.labels,
        },
      };
    }
  };
</script>

<ClickTarget />
<LabelPanel
  config={state.config}
  labels={state.labels}
  {editableConfig}
  {disabled}
  on:change={save}
  on:editConfig={(event) => {
    const config = state.config.find((c) => c.name == event.detail.name);
    if (config) {
      configEditorOptions = {
        ...configEditorOptions,
        open: true,
        existing: {
          config,
          level,
        },
      };
    }
  }}
/>
{#if regions && config.regions && config.regions.length > 0}
  <div class="drawing-configuration">
    <div class="drawing-mode">
      <LabelPanel
        editableConfig={false}
        on:change={(event) =>
          (draft = {
            ...draft,
            drawing: {
              ...draft.drawing,
              mode: event.detail.labels.drawingMode[0],
            },
          })}
        disabled={!!draft.drawing.active || disabled}
        labels={{ drawingMode: [draft.drawing.mode] }}
        config={[
          {
            hiderequired: true,
            required: true,
            name: "drawingMode",
            displayName: "Drawing Mode",
            options: [
              { name: "boxes", displayName: "Boxes" },
              { name: "polygons", displayName: "Polygon" },
              { name: "masks", displayName: "Mask" },
            ],
            multiple: false,
            freeform: false,
            layout: "row",
          },
        ]}
      />
    </div>
    <div class="size-threshold">
      <RangeSlider
        name="Cursor Size"
        bind:value={draft.drawing.radius}
        min={1}
        max={50}
        disabled={false}
        aria-label="segmentation mask labeling radius"
      />
    </div>
    <div class="flood-threshold">
      <RangeSlider
        name="Flood Fill"
        bind:value={draft.drawing.threshold}
        min={-1}
        step={1}
        marks={[{ value: -1, label: "Off" }, { value: 0 }]}
        disabled={false}
        max={10}
        aria-label="segmentation mask flood threshold"
      />
    </div>
  </div>
{/if}
<div class="controls">
  <div class="control-group">
    <FocusIndicator />
    {#if draft.drawing.active}
      <ButtonGroup
        on:click={({ detail: { name } }) => {
          if (name !== "save-region" && name !== "delete-region") {
            dispatcher(name);
            return;
          }
          dispatcher("change");
          draft = {
            ...draft,
            dirty: true,
            labels: {
              ...draft.labels,
              [draft.drawing.mode]: (name === "save-region" &&
              draft.drawing.active
                ? [draft.drawing.active.region]
                : []
              ).concat(draft.labels[draft.drawing.mode]),
            },
            drawing: {
              ...draft.drawing,
              active: undefined,
            },
          };
        }}
        configs={[
          {
            text: draft.drawing.active.region.readonly ? "Deselect" : "Finish",
            event: "save-region",
            disabled: !valid,
            tooltip: valid
              ? "Finish labeling region"
              : "Please fill all required fields.",
            class: "finish-region",
            shortcuts: [{ key: "Enter" }],
          },
          {
            text: "Delete",
            shortcuts: [{ key: "Delete" }, { key: "Backspace" }],
            event: "delete-region",
            tooltip: "Delete this region.",
            disabled: disabled,
          },
          {
            text: "Undo",
            event: "undo",
            tooltip: "Undo last operation",
            hidden: !actions.undo,
            disabled,
            shortcuts: [{ key: "z", ctrlKey: true }],
          },
        ]}
      />
    {:else}
      <ButtonGroup
        on:click={action}
        configs={[
          {
            text: "Save",
            event: "save",
            shortcuts: [{ key: "Enter" }],
            tooltip: valid
              ? "Save current labels."
              : "Please fill all required fields.",
            disabled: !actions.save || disabled || !valid,
          },
          {
            text: actions.ignore ? "Ignore" : "Unignore",
            event: actions.ignore ? "onIgnore" : "onUnignore",
            disabled,
            hidden: !actions.ignore && !actions.unignore,
            shortcuts: [],
            tooltip: "Ignore this item.",
          },
          {
            text: "Delete",
            event: "delete",
            shortcuts: [{ key: "Backspace" }, { key: "Delete" }],
            tooltip: "Delete labels",
            disabled,
            hidden: !actions.delete,
          },
          {
            text: "Reset",
            event: "reset",
            hidden: !draft.dirty,
            disabled,
            shortcuts: [],
            tooltip: "Reset labels to current saved version.",
          },
          {
            text: "Undo",
            event: "undo",
            hidden: !actions.undo,
            shortcuts: [{ key: "z", ctrlKey: true }],
            tooltip: "Undo the last action",
            disabled,
          },
          {
            text: "Download",
            event: "download",
            hidden: !actions.download,
            shortcuts: [],
            tooltip: "Download this item.",
            disabled,
          },
        ]}
      />
    {/if}
  </div>
  {#if !draft.drawing.active}
    {#if actions.selectAll || actions.selectNone}
      <div class="control-group">
        <ButtonGroup
          on:click={({ detail: { name } }) => dispatcher(name)}
          configs={[
            {
              text: "Select All",
              event: "selectAll",
              disabled: !actions.selectAll || disabled,
              class: "select-all",
              shortcuts: [{ ctrlKey: true, key: "a" }],
              tooltip: "Select All",
              hidden: !actions.selectAll,
            },
            {
              text: "Select None",
              event: "selectNone",
              disabled: !actions.selectNone || disabled,
              hidden: !actions.selectNone,
              shortcuts: [{ ctrlKey: true, shiftKey: true, key: "a" }],
              tooltip: "Select None",
              class: "select-none",
            },
          ]}
        />
      </div>
    {/if}
    {#if actions.prev || actions.next || navigation}
      <div class="control-group">
        <ButtonGroup
          on:click={action}
          configs={[
            {
              text: "Previous",
              event: "prev",
              disabled: disabled || !actions.prev || draft.dirty,
              shortcuts: [{ key: "ArrowLeft" }],
              tooltip: "Go to previous item.",
            },
            {
              text: "Next",
              event: "next",
              disabled: disabled || !actions.next || draft.dirty,
              shortcuts: [{ key: "ArrowRight" }],
              tooltip: "Got to next item.",
            },
          ]}
        />
      </div>
    {/if}
    {#if editableConfig || actions.showIndex}
      <div class="control-group">
        <ButtonGroup
          on:click={(event) => {
            if (event.detail.name == "showIndex") {
              action(event);
            } else {
              configEditorOptions = {
                ...configEditorOptions,
                open: true,
                existing: undefined,
              };
            }
          }}
          configs={[
            {
              text: "Add Type",
              event: "addType",
              tooltip: "Add new label configuration",
              hidden: !editableConfig,
              shortcuts: [],
              disabled,
            },
            {
              text: "View Index",
              event: "showIndex",
              disabled,
              tooltip: "View media index",
              hidden: !actions.showIndex,
              shortcuts: [],
            },
          ]}
        />
      </div>
    {/if}
  {/if}
</div>

<ConfigEditor
  open={configEditorOptions.open}
  existing={configEditorOptions.existing}
  on:close={() =>
    (configEditorOptions = { ...configEditorOptions, open: false })}
  on:save={saveConfig}
/>

<style>
  .controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    column-gap: 10px;
    row-gap: 10px;
    flex-wrap: wrap;
  }
  .control-group {
    display: flex;
    flex-direction: row;
    align-items: center;
    column-gap: 10px;
    flex: 1 0 auto;
  }
  .control-group :global(.button-group-container) {
    flex: 1 0 auto;
  }
  .drawing-configuration {
    display: flex;
    flex-direction: row;
    align-items: center;
    column-gap: 15px;
    flex-wrap: wrap;
  }
  .drawing-configuration .drawing-mode {
    flex: 1 0 0;
  }
  .drawing-configuration .size-threshold,
  .drawing-configuration .flood-threshold {
    flex: 1 0 30%;
  }
  @media (max-width: 640px) {
    .control-group {
      flex: 1 1 100%;
    }
  }
</style>
