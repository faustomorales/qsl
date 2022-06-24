<script lang="ts">
  import { Extractor, ActionType } from "./types";
  import { toast } from "./components/library/stores";
  import ImageLabeler from "./components/ImageLabeler.svelte";
  import BatchImageLabeler from "./components/BatchImageLabeler.svelte";
  import MediaIndex from "./components/MediaIndex.svelte";
  import VideoLabeler from "./components/VideoLabeler.svelte";
  import TimeSeriesLabeler from "./components/TimeSeriesLabeler.svelte";
  import Labeler from "./components/Labeler.svelte";
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
  message.subscribe((update: string) => {
    if (update) {
      toast.push(update);
      message.set("");
    }
  });
  $: urlStrings = ($urls as any[]).filter((u) => typeof u === "string");
  $: urlObjects = ($urls as any[]).filter((u) => typeof u === "object");
</script>

<Labeler progress={$progress} mode={$mode}
  >{#if $viewState == "labeling" || $viewState == "transitioning"}
    {#if $urls.length == 1}
      {#if $type === "image" && !Array.isArray($labels)}
        <ImageLabeler
          transitioning={$viewState === "transitioning"}
          target={urlStrings[0]}
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
  {/if}</Labeler
>
