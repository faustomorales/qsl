import React from "react";
import Demonstrator from "../react-image-labeler/Demonstrator";
import {
  BatchImageLabeler,
  VideoLabeler,
  ImageLabeler,
  Labeler,
  TimestampedLabel,
} from "../react-image-labeler/index";
import { config, images } from "./data";

export const LabelingImages: React.FC = () => {
  const [state, setState] = React.useState({
    src: images[0].url,
    labels: images[0].labels,
    config,
  });
  return (
    <Demonstrator
      steps={[
        {
          text: "Add new label types on the fly.",
          target: ".add-new-label",
          offset: {
            x: 0.0,
            y: 1.2,
          },
        },
        {
          text: "Use keyboard shortcuts to make labeling faster.",
          target:
            ".label-panel-entry[name=Category] .react-image-labeler-input-target input[name=outdoor]",
          offset: {
            x: 1.0,
            y: 1.0,
          },
        },
        {
          text: "Switch between different types of region annotations.",
          target: ".drawing-mode-option input[value=polygons]",
          offset: {
            x: 0.0,
            y: 1.0,
          },
        },
        {
          text: "Click to start selecting a region.",
          target: ".media",
          offset: {
            x: 0.15,
            y: 0.1,
          },
        },
        {
          text: "Zoom in by scrolling while holding down Control (on mouse) or with pinch gestures (on trackpad).",
          target: ".zoom .slider-thumb",
          offset: {
            x: 0.0,
            y: 2.0,
          },
        },
        {
          text: "Pan across media by scrolling (to go up and down), Shift+Scrolling (to go left and right), or using two finger scroll (on trackpad).",
          target: ".media",
          offset: {
            x: 0.25,
            y: 0.2,
          },
        },
        {
          text: "You can also navigate the image by clicking on the minimap.",
          target: ".minimap",
          offset: {
            x: 0.0,
            y: 1.05,
          },
        },
      ]}
    >
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
    </Demonstrator>
  );
};

export const LabelingVideos: React.FC = () => {
  const [state, setState] = React.useState({
    src: "video1.m4v",
    labels: [
      { timestamp: 0, labels: { image: {}, boxes: [] }, end: 1.3 },
    ] as TimestampedLabel[],
    config,
  });
  return (
    <Demonstrator
      steps={[
        {
          text: "Play and pause using the spacebar key or by clicking.",
          target: ".playpause",
          offset: {
            x: 0.0,
            y: 1,
          },
        },
        {
          text: "Scrub through video using the timeline.",
          target: ".playbar .slider-thumb[data-index='0']",
          offset: {
            x: 0,
            y: 2.0,
          },
        },
        {
          text: "Optionally set an end timestamp by Alt-Clicking on timeline.",
          target: ".playbar .slider-thumb[data-index='1']",
          offset: {
            x: 0,
            y: 2.0,
          },
        },
      ]}
    >
      <Labeler>
        <VideoLabeler
          target={state.src}
          config={config}
          labels={state.labels}
          callbacks={{
            onSaveConfig: (config) => setState({ ...state, config }),
            onSave: (labels) => setState({ ...state, labels }),
          }}
        />
      </Labeler>
    </Demonstrator>
  );
};

export const LabelingBatches: React.FC = () => {
  const [state, setState] = React.useState({
    target: images
      .concat([
        {
          url: undefined,
          labels: {},
          metadata: {
            Comment:
              "You don't have to have an image to label. You can label arbitrary metadata, too!",
          },
        },
      ])
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
  });
  return (
    <Demonstrator
      steps={[
        {
          target: ".selection-control",
          text: "Quickly toggle which images are selected.",
          offset: { x: 0, y: 1.25 },
        },
        {
          target: ".batch-image-list-item[data-index='3']",
          text: "Click on images to select or deselect them for labeling.",
          offset: { x: 0.5, y: 0.5 },
        },
      ]}
    >
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
          labels={
            state.target.find((t) => t.visible && t.selected)?.labels || {}
          }
          options={{ showNavigation: true }}
          callbacks={{
            onSave: (labels) =>
              setState({
                ...state,
                target: state.target.map((t) => {
                  return {
                    ...t,
                    visible: t.selected ? false : t.visible,
                    labels: t.selected && t.visible ? labels : t.labels,
                  };
                }),
              }),
          }}
        />
      </Labeler>
    </Demonstrator>
  );
};

export default {
  title: "Demonstrator",
};
