<script lang="ts">
  import * as data from "./data";
  import TimeSeriesLabeler from "../components/TimeSeriesLabeler.svelte";
  import Labeler from "../components/Labeler.svelte";
  let targets = data.timeSeries;
  let idx = 0;
  let config = data.timeSeriesConfig;
  let labels = {};
</script>

<Labeler>
  <TimeSeriesLabeler
    target={targets[idx]}
    bind:config
    bind:labels
    viewHeight={900}
    on:next={() => (idx += 1)}
    on:prev={() => (idx -= 1)}
    actions={{
      next: idx + 1 < targets.length,
      prev: idx > 0,
    }}
  />
</Labeler>
