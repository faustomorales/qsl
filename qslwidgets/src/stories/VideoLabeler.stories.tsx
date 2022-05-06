import React from "react";
import { VideoLabeler, Labeler } from "../react-image-labeler";
import { config } from "./data";
import { TimestampedLabel } from "../react-image-labeler/components/library/types";

export const BasicUsage: React.FC = () => {
  const [state, setState] = React.useState<{
    src: string;
    labels: TimestampedLabel[];
  }>({
    src: "video1.m4v",
    labels: [{ timestamp: 0, labels: { image: {}, boxes: [] }, end: 1.3 }],
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
