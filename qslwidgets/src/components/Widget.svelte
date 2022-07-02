<script lang="ts">
  import type { Extractor, ActionType } from "../library/types";
  import { toast } from "../library/stores";
  import ImageLabeler from "./ImageLabeler.svelte";
  import BatchImageLabeler from "./BatchImageLabeler.svelte";
  import MediaIndex from "./MediaIndex.svelte";
  import VideoLabeler from "./VideoLabeler.svelte";
  import TimeSeriesLabeler from "./TimeSeriesLabeler.svelte";
  import ImagePreloader from "./ImagePreloader.svelte";
  import Labeler from "./Labeler.svelte";
  export let extract: Extractor;
  const viewState = extract("viewState");
  const urls = extract("urls");
  const type = extract("type");
  const config = extract("config");
  const labels = extract("labels");
  const maxCanvasSize = extract("maxCanvasSize");
  const buttons = extract("buttons");
  const states = extract("states");
  const progress = extract("progress");
  const mode = extract("mode");
  const action = extract("action");
  const idx = extract("idx");
  const indexState = extract("indexState");
  const createAction = (name: ActionType) => () => action.set(name);
  const message = extract("message");
  const viewHeight = extract("maxViewHeight");
  const preload = extract("preload");
  const message2toast = () => {
    const update = $message;
    if (update) {
      toast.push(update);
      message.set("");
    }
  };
  $: $message, message2toast();
  $: urlStrings = (($urls || []) as any[]).filter((u) => typeof u === "string");
  $: urlObjects = (($urls || []) as any[]).filter((u) => typeof u === "object");
</script>

<Labeler progress={$progress} mode={$mode}>
  {#if $viewState && $urls && $type && $labels}
    {#if $viewState == "labeling" || $viewState == "transitioning"}
      {#if $urls.length == 1}
        {#if $type === "image" && !Array.isArray($labels)}
          <ImageLabeler
            transitioning={$viewState === "transitioning"}
            target={urlStrings[0]}
            viewHeight={$viewHeight}
            bind:config={$config}
            bind:labels={$labels}
            maxCanvasSize={$maxCanvasSize}
            metadata={$states[0].metadata}
            editableConfig={$buttons.config}
            actions={{ ...$buttons, showIndex: true }}
            on:next={createAction("next")}
            on:prev={createAction("prev")}
            on:delete={createAction("delete")}
            on:ignore={createAction("ignore")}
            on:unignore={createAction("unignore")}
            on:save={createAction("save")}
            on:showIndex={createAction("index")}
          />
        {:else if $type == "video" && Array.isArray($labels)}
          <VideoLabeler
            transitioning={$viewState === "transitioning"}
            target={urlStrings[0]}
            viewHeight={$viewHeight}
            bind:config={$config}
            bind:labels={$labels}
            maxCanvasSize={$maxCanvasSize}
            metadata={$states[0].metadata}
            editableConfig={$buttons.config}
            actions={{ ...$buttons, showIndex: true }}
            on:next={createAction("next")}
            on:prev={createAction("prev")}
            on:delete={createAction("delete")}
            on:ignore={createAction("ignore")}
            on:unignore={createAction("unignore")}
            on:save={createAction("save")}
            on:showIndex={createAction("index")}
          />
        {:else if $type == "time-series" && !Array.isArray($labels)}
          <TimeSeriesLabeler
            transitioning={$viewState === "transitioning"}
            target={urlObjects[0]}
            viewHeight={$viewHeight}
            bind:config={$config}
            bind:labels={$labels}
            editableConfig={$buttons.config}
            actions={{ ...$buttons, showIndex: true }}
            on:next={createAction("next")}
            on:prev={createAction("prev")}
            on:delete={createAction("delete")}
            on:ignore={createAction("ignore")}
            on:unignore={createAction("unignore")}
            on:save={createAction("save")}
            on:showIndex={createAction("index")}
          />
        {:else}
          <div />
        {/if}
      {:else if !Array.isArray($labels)}
        <BatchImageLabeler
          transitioning={$viewState === "transitioning"}
          targets={urlStrings}
          bind:states={$states}
          bind:config={$config}
          bind:labels={$labels}
          editableConfig={$buttons.config}
          actions={{ ...$buttons, showIndex: true }}
          on:next={createAction("next")}
          on:prev={createAction("prev")}
          on:delete={createAction("delete")}
          on:ignore={createAction("ignore")}
          on:unignore={createAction("unignore")}
          on:save={createAction("save")}
          on:showIndex={createAction("index")}
        />
      {/if}
    {:else if $viewState == "index"}
      <MediaIndex
        bind:indexState={$indexState}
        bind:idx={$idx}
        on:label={createAction("label")}
        on:sort={createAction("index")}
      />
    {:else}
      <p>Unexpected view state requested.</p>
      >
    {/if}
    {#if $preload}
      <ImagePreloader images={$preload} />
    {/if}
  {/if}
</Labeler>
