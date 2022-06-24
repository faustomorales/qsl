<script lang="ts">
  import * as data from "./data";
  import MediaIndex from "../components/MediaIndex.svelte";
  import Labeler from "../components/Labeler.svelte";
</script>

<Labeler>
  <MediaIndex indexState={data.indexState} />
</Labeler>
