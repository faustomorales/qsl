import React from "react";
import { ImageLabeler, Labeler, Labels } from "../react-image-labeler";
import { images, config } from "./data";

export default {
  title: "ImageLabeler",
  component: ImageLabeler,
};

export const BasicUsage: React.FC = () => {
  const [state, setState] = React.useState({
    src: images[0].url,
    labels: images[0].labels,
    config: config,
  });
  return (
    <Labeler>
      <ImageLabeler
        callbacks={{
          onSaveConfig: (config) => setState({ ...state, config }),
          onSave: (labels) => setState({ ...state, labels }),
        }}
        config={state.config}
        labels={state.labels}
        target={state.src}
      />
    </Labeler>
  );
};

export const UsageWithMultipleImages: React.FC = () => {
  const [state, setState] = React.useState({
    idx: 0,
    images,
    config,
  });
  const onSave = React.useCallback(
    (labels: Labels) => {
      setState({
        ...state,
        idx: state.idx + 1 < state.images.length ? state.idx + 1 : state.idx,
        images: state.images
          .slice(0, state.idx)
          .concat([{ url: state.images[state.idx].url, labels }])
          .concat(state.images.slice(state.idx + 1)),
      });
    },
    [state]
  );
  return (
    <Labeler>
      <ImageLabeler
        config={state.config}
        labels={state.images[state.idx].labels}
        target={state.images[state.idx].url}
        metadata={state.images[state.idx].metadata}
        options={{
          progress: Math.round((100 * state.idx) / images.length),
        }}
        preload={
          state.idx < images.length - 1
            ? (state.images
                .slice(state.idx + 1)
                .filter((i) => i["url"])
                .map((i) => i["url"]) as string[])
            : undefined
        }
        callbacks={{
          onSave,
          onSaveConfig: (config) => setState({ ...state, config }),
          onDelete: () => onSave({}),
          onPrev:
            state.idx == 0
              ? undefined
              : () => setState({ ...state, idx: state.idx - 1 }),
          onNext:
            state.idx == state.images.length - 1
              ? undefined
              : () => setState({ ...state, idx: state.idx + 1 }),
        }}
      />
    </Labeler>
  );
};

export const UsageWithoutImage: React.FC = () => {
  const [state, setState] = React.useState({
    labels: images[0].labels,
    config: config,
  });
  return (
    <Labeler>
      <ImageLabeler
        callbacks={{
          onSaveConfig: (config) => setState({ ...state, config }),
          onSave: (labels) => setState({ ...state, labels }),
        }}
        config={state.config}
        labels={state.labels}
        metadata={{ foo: "bar" }}
      />
    </Labeler>
  );
};
