import React from "react";
import { BatchImageLabeler, Labeler } from "../react-image-labeler";
import { config, images } from "./data";

export const BasicUsage: React.FC = () => {
  const [state, setState] = React.useState({
    target: images
      .concat([{ url: undefined, labels: {}, metadata: { text: "Hello!" } }])
      .map((i, iIdx) => {
        return {
          url: i.url,
          metadata: i.metadata,
          selected: true,
          visible: true,
          ignored: iIdx % 2 == 0,
          labeled: iIdx % 3 == 0,
          labels: i.labels,
        };
      }),
    selected: images.map((i, idx) => idx),
    labels: {},
  });
  return (
    <Labeler>
      <BatchImageLabeler
        target={state.target.map((t) => t.url)}
        config={config}
        states={state.target.map((t) => {
          return { ...t, labels: { image: t.labels.image, boxes: [] } };
        })}
        setStates={(target) =>
          setState({
            ...state,
            target: target.map((t, tIdx) => {
              return { ...t, url: state.target[tIdx].url };
            }) as any,
          })
        }
        labels={state.labels}
        options={{ showNavigation: true }}
        callbacks={{
          onSave: (labels) => setState({ ...state, labels }),
        }}
      />
    </Labeler>
  );
};

export default {
  title: "BatchImageLabeler",
};
