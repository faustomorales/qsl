<script lang="ts">
  import { writable } from "svelte/store";
  import type { Writable } from "svelte/store";
  import type { Config, Labels } from "../library/types";
  import CompoundLabeler from "../components/CompoundLabeler.svelte";
  import Labeler from "../components/Labeler.svelte";
  import * as data from "./data";

  let config: Writable<Config> = writable(data.config);
  let labels: Writable<Labels> = writable({});
  let target = {
    images: data.images.map((i) => ({ target: i.url, metadata: i.metadata })),
  };
</script>

<Labeler mode="light">
  <CompoundLabeler
    bind:config={$config}
    bind:labels={$labels}
    {target}
    metadata={{ bar: "baz" }}
  />
</Labeler>
