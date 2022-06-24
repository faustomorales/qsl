<script lang="ts">
  import { Writable, writable } from "svelte/store";
  import { Config, Labels, BatchEntry } from "../components/library/types";
  import BatchImageLabeler from "../components/BatchImageLabeler.svelte";
  import Labeler from "../components/Labeler.svelte";
  import * as data from "./data";

  let config: Writable<Config> = writable(data.config);
  let labels: Writable<Labels> = writable({});
  let targets = data.images.map((i) => i.url);
  let states: Writable<BatchEntry[]> = writable(
    targets.map((_, ti) => ({
      visible: true,
      selected: true,
      ignored: ti % 3 == 0,
      labeled: ti % 2 == 0,
      metadata: data.images[ti].metadata,
      labels: {},
    }))
  );
</script>

<Labeler mode="light">
  <BatchImageLabeler
    bind:config={$config}
    bind:labels={$labels}
    bind:states={$states}
    {targets}
  />
</Labeler>
