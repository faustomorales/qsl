<script lang="ts">
  import * as data from "./data";
  import Labeler from "../components/Labeler.svelte";
  import VideoSegmentLabeler from "../components/VideoSegmentLabeler.svelte";
</script>

<Labeler>
  <VideoSegmentLabeler
    config={{}}
    target={{
      video1: {
        target: data.videos[0].url,
      },
      video2: {
        target: data.videos[0].url,
      },
    }}
    labels={[
      {
        timestamp: 0,
        end: 2,
        labels: {},
        match: {
          timestamp: 2,
          end: 4,
        },
      },
    ]}
  />
</Labeler>
