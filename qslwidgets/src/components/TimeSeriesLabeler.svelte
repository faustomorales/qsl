<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type {
    Config,
    Labels,
    WidgetActions,
    Dimensions,
    ArbitraryMetadata,
    TimeSeriesTarget,
  } from "../library/types";
  import html2canvas from "html2canvas";
  import FileSaver from "file-saver";
  import { createDraftStore } from "../library/common";
  import ControlMenu from "./ControlMenu.svelte";
  import MediaViewer from "./MediaViewer.svelte";
  import TimeSeries from "./TimeSeries.svelte";
  import Metadata from "./Metadata.svelte";
  import { getStores } from "../library/instanceStores";
  export let target: TimeSeriesTarget | undefined,
    config: Config,
    labels: Labels,
    metadata: ArbitraryMetadata = {},
    navigation: boolean = false,
    editableConfig: boolean = false,
    transitioning: boolean = false,
    viewHeight: number | null = 384,
    actions: WidgetActions = {};
  const dispatcher = createEventDispatcher();
  let { draft, history } = createDraftStore();
  $: target, labels, draft.reset(labels);
  let downloadContainer: HTMLDivElement;
  let chartSize: Dimensions | undefined = undefined;
  let clientWidth = 0;
  let { toast } = getStores();
  const download = () => {
    html2canvas(downloadContainer, {
      logging: false,
    }).then((canvas) => {
      if (!target?.filename) {
        return;
      }
      const png = canvas.toDataURL("image/png", 1.0);
      if (png) {
        FileSaver.saveAs(
          png,
          target.filename.toLowerCase().endsWith(".png")
            ? target.filename
            : target.filename + ".png"
        );
      } else {
        toast.push("Failed to render figure.");
      }
    });
  };
</script>
<div bind:clientWidth />
<MediaViewer
  {viewHeight}
  size={chartSize}
  loadState={transitioning || !chartSize ? "loading" : "loaded"}
  enhancementControls={false}
>
  <svelte:fragment slot="main"
    ><TimeSeries
      {config}
      {target}
      defaultWidth={clientWidth}
      bind:labels={$draft.labels}
      bind:chartSize
    /></svelte:fragment
  >
  <svelte:fragment slot="mini"
    ><TimeSeries {config} {target} labels={$draft.labels} /></svelte:fragment
  >
</MediaViewer>
  <Metadata {metadata} />
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
    on:download={download}
    on:undo={() => history.undo()}
    on:save={() => {
      labels = draft.export();
      dispatcher("save");
    }}
    on:reset={() => draft.reset(labels)}
    disabled={transitioning}
    {editableConfig}
    {navigation}
    regions={false}
    actions={{ ...actions, undo: $history > 0, download: !!target?.filename }}
  />
<div class="download-container-wrapper">
  <div bind:this={downloadContainer} class="download-container">
    <TimeSeries {config} {target} labels={$draft.labels} />
    <Metadata {metadata} />
  </div>
</div>

<style>
  .download-container {
    --text-color: black;
    display: inline-block;
    padding: 20;
  }
  .download-container-wrapper {
    height: 0;
    overflow: scroll;
  }
</style>
