<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { LabelConfig } from "./library/types";
  import LabelPanel from "./LabelPanel.svelte";
  import ButtonGroup from "./ButtonGroup.svelte";
  export let open: boolean,
    existing: { level: "image" | "regions"; config: LabelConfig } | undefined =
      undefined;
  const emptyState = {
    properties: [] as string[],
    displayName: "",
    name: "",
    level: "image" as "image" | "regions",
    options: [] as string[],
    mockSelected: [] as string[],
    required: false,
  };
  const dispatcher = createEventDispatcher();
  $: state = existing
    ? {
        ...emptyState,
        properties: ([] as string[])
          .concat(existing.config?.freeform ? ["freeform"] : [])
          .concat(existing.config?.multiple ? ["multiple"] : [])
          .concat(existing.config?.required ? ["required"] : []),
        displayName: existing.config.displayName || "",
        name: (existing.config.name || "") as string,
        level: existing.level,
        options:
          existing.config.options?.map((o) => o.displayName || o.name) ||
          ([] as string[]),
      }
    : emptyState;
  $: valid =
    state.name &&
    (state.properties.indexOf("freeform") > -1 || state.options.length > 0);
  const extractOptions = (options?: string[], existing?: LabelConfig) =>
    options && options.length > 0
      ? options.map((o) => {
          return {
            name: o,
            ...(existing?.options
              ? existing.options.find((e) => (e.displayName || e.name) === o) ||
                {}
              : {}),
          };
        })
      : undefined;
  $: onClick = (event: any) => {
    if (event.detail.name == "save") {
      dispatcher("save", {
        config: {
          name: state.name,
          displayName: state.displayName,
          multiple: state.properties.indexOf("multiple") > -1,
          freeform: state.properties.indexOf("freeform") > -1,
          required: state.properties.indexOf("required") > -1,
          options: extractOptions(state.options, existing?.config),
        },
        level: state.level,
      });
      state = emptyState;
      dispatcher("close");
    } else if (event.detail.name == "cancel") {
      dispatcher("close");
      state = emptyState;
    }
  };
</script>

<div style="display: {open ? 'block' : 'none'}" class="config-editor-container">
  <div class="backdrop" />
  <div class="config-editor">
    <span>
      {existing ? "Edit Label Configuration" : "Add New Label Configuration"}
    </span>
    <LabelPanel
      disabled={false}
      editableConfig={false}
      on:change={(event) => {
        state = {
          ...state,
          name: event.detail.labels.name[0],
          displayName: event.detail.labels.displayName[0],
          level: event.detail.labels.level[0],
          properties: event.detail.labels.properties,
          options: event.detail.labels.options,
        };
      }}
      labels={{
        name: [state.name],
        displayName: [state.displayName],
        level: [state.level],
        properties: state.properties,
        options: state.options,
      }}
      config={[
        {
          multiple: false,
          freeform: true,
          name: "name",
          displayName: "Name",
          disabled: !!existing,
          freeformtag: "input",
          panelrow: 0,
        },
        {
          multiple: false,
          freeform: true,
          displayName: "Display Name",
          name: "displayName",
          disabled: !!existing,
          freeformtag: "input",
          panelrow: 0,
        },
        {
          options: [
            { name: "image", displayName: "Image" },
            { name: "regions", displayName: "Regions" },
          ],
          multiple: false,
          freeform: false,
          name: "level",
          displayName: "Level",
          disabled: !!existing,
          required: true,
          panelrow: 1,
        },
        {
          options: [
            { name: "freeform", displayName: "Freeform" },
            { name: "multiple", displayName: "Multiple" },
            { name: "required", displayName: "Required" },
          ],
          multiple: true,
          freeform: false,
          name: "properties",
          displayName: "Type",
          panelrow: 1,
        },
        {
          options: [],
          multiple: true,
          freeform: true,
          displayName: "Options",
          name: "options",
          panelrow: 1,
        },
      ]}
    />
    <ButtonGroup
      on:click={onClick}
      configs={[
        {
          disabled: !valid,
          event: "save",
          text: "Save",
          shortcuts: [],
          tooltip: "Save configuration change",
        },
        {
          disabled: false,
          event: "cancel",
          text: "Cancel",
          shortcuts: [],
          tooltip: "Cancel configuration change",
        },
      ]}
    />
    {#if valid}
      <hr />
      <span>Your new label panel will look like this.</span>
      <LabelPanel
        disabled={false}
        editableConfig={false}
        config={[
          {
            name: state.name,
            displayName: state.displayName,
            options: extractOptions(state.options, existing?.config),
            multiple: state.properties.indexOf("multiple") > -1,
            freeform: state.properties.indexOf("freeform") > -1,
            required: state.properties.indexOf("required") > -1,
          },
        ]}
        labels={{ [state.name]: state.mockSelected }}
        on:change={(event) => {
          state = { ...state, mockSelected: event.detail.labels[state.name] };
        }}
      />
    {/if}
  </div>
</div>

<style>
  .config-editor {
    padding: 16px;
    position: absolute;
    display: flex;
    flex-direction: column;
    row-gap: 10px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: var(--background-color);
    color: var(--text-color);
    border: 2px solid #000;
    box-shadow: 5px 5px 20px;
    z-index: 3;
    width: 300px;
    max-width: 90%;
  }
  .backdrop {
    position: fixed;
    display: flex;
    align-items: center;
    right: 0;
    top: 0;
    bottom: 0;
    left: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 2;
    transition: opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    opacity: 1;
  }
  hr {
    width: 100%;
  }
</style>
