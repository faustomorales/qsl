<script lang="ts">
  import * as data from "./data";
  import TimeSeriesLabeler from "../components/TimeSeriesLabeler.svelte";
  import Labeler from "../components/Labeler.svelte";
  const target = data.timeSeries[0];
  let config = data.timeSeriesConfig;
  let labels = {};
</script>

<Labeler>
  <TimeSeriesLabeler {target} bind:config bind:labels viewHeight={null} />
</Labeler>
