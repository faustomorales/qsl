<script lang="ts">
  import type { Writable } from "svelte/store";
  import { writable } from "svelte/store";
  import type { Labels, Config } from "../library/types";
  import ImageStackLabeler from "../components/ImageStackLabeler.svelte";
  import Labeler from "../components/Labeler.svelte";
  import * as data from "./data";
  let rotation = Math.PI / 4;
  let target = {
    images: [
      {
        name: "image3",
        target: "image3.jpg",
        transform: [
          [1, 0, 0],
          [0, 1, 0],
        ],
      },
      {
        name: "image3-45ccw",
        target: "image3.45ccw.jpg",
        alt: "image 3 rotated",
        transform: [
          [Math.cos(rotation), -Math.sin(rotation), 0],
          [Math.sin(rotation), Math.cos(rotation), 0],
        ],
      },
    ],
  };
  let config: Writable<Config> = writable(data.config);
  let labels: Writable<Labels> = writable({});
  let metadata = { foo: "bar" };
</script>

<Labeler progress={35}>
  <ImageStackLabeler
    {target}
    bind:labels={$labels}
    bind:config={$config}
    {metadata}
    editableConfig
    actions={{
      save: true,
      next: false,
      prev: true,
      delete: true,
    }}
  />
</Labeler>
