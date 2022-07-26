<script lang="ts">
  import { writable } from "svelte/store";
  import type { Writable } from "svelte/store";
  import type { Config, Labels, ImageGroupTarget } from "../library/types";
  import ImageGroupLabeler from "../components/ImageGroupLabeler.svelte";
  import Labeler from "../components/Labeler.svelte";
  import * as data from "./data";

  let config: Writable<Config> = writable(data.config);
  let labels: Writable<Labels> = writable({});
  let target: ImageGroupTarget = {
    images: data.images.map((img, imgIndex) => ({
      target: img.url,
      metadata: img.metadata,
      group: imgIndex % 3 == 0 ? "Group 1" : undefined,
    })),
    onClick: { c: "Category", q: "Quality", "": "Description" },
  };
</script>

<Labeler>
  <ImageGroupLabeler
    bind:config={$config}
    bind:labels={$labels}
    {target}
    metadata={{ bar: "baz" }}
  />
</Labeler>
