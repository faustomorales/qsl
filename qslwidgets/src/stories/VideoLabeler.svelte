<script lang="ts">
  import VideoLabeler from "../components/VideoLabeler.svelte";
  import Labeler from "../components/Labeler.svelte";
  import * as data from "./data";

  let index = 0;
  let config = data.config;
  $: ({ url, labels } = data.videos[index]);
</script>

<Labeler>
  <VideoLabeler
    target={url}
    bind:labels
    bind:config
    on:next={() => (index = index + 1)}
    on:prev={() => (index = index - 1)}
    actions={{
      save: true,
      next: index < data.videos.length,
      prev: index != 0,
      delete: true,
    }}
  />
</Labeler>
