import React from "react";
import { VideoLabeler, Labeler } from "../react-image-labeler";
import { config } from "./data";
import { TimestampedLabel } from "../react-image-labeler/components/library/types";

export const BasicUsage: React.FC = () => {
  const [state, setState] = React.useState<{
    src: string;
    labels: TimestampedLabel[];
  }>({
    src: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    labels: [],
  });
  return (
    <Labeler>
      <VideoLabeler
        target={state.src}
        config={config}
        labels={state.labels}
        callbacks={{
          onSave: (labels) => setState({ ...state, labels }),
        }}
      />
    </Labeler>
  );
};

export default {
  title: "VideoLabeler",
};
