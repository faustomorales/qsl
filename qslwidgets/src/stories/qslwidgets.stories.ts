import ImageLabeler from "./ImageLabeler.svelte";
import BatchImageLabeler from "./BatchImageLabeler.svelte";
import VideoLabeler from "./VideoLabeler.svelte";
import TimeSeriesLabeler from "./TimeSeriesLabeler.svelte";
import MediaIndex from "./MediaIndex.svelte";
import CompoundLabeler from "./CompoundLabeler.svelte";

export default {
  title: "qslwidgets",
  argTypes: {},
};

export const SingleImage = () => ({
  Component: ImageLabeler,
});
export const BatchedImages = () => ({
  Component: BatchImageLabeler,
});
export const Video = () => ({
  Component: VideoLabeler,
});
export const Time = () => ({
  Component: TimeSeriesLabeler,
});
export const Compound = () => ({
  Component: CompoundLabeler,
});
export const Index = () => ({
  Component: MediaIndex,
});
