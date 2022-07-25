<script lang="ts">
  import type { Labels, Config } from "../library/types";
  import type { Writable } from "svelte/store";
  import { writable } from "svelte/store";
  import * as data from "./data";
  import Labeler from "../components/Labeler.svelte";
  import ImageLabeler from "../components/ImageLabeler.svelte";
  let index = writable(0);
  let target = data.images[$index].url;
  let metadata = data.images[$index].metadata;
  let config: Writable<Config> = writable(data.config);
  let labels: Writable<Labels> = writable(data.images[$index].labels);
  const sync = () => {
    labels.set(data.images[$index].labels);
    target = data.images[$index].url;
    metadata = data.images[$index].metadata;
  };
  $: $index, sync();
</script>

<Labeler progress={35}>
  <ImageLabeler
    {target}
    bind:labels={$labels}
    bind:config={$config}
    {metadata}
    on:next={() => index.set($index + 1)}
    on:prev={() => index.set($index - 1)}
    editableConfig
    actions={{
      save: true,
      next: $index < data.images.length - 1,
      prev: $index != 0,
      delete: true,
    }}
  />
</Labeler>
