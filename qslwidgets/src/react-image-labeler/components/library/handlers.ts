import { unfill, img2hsv, fillHsv, findMaskByPoint } from "./flooding";
import { computeDistance, snapPolygonCoords } from "./geometry";
import { DraftState, DrawingState, Point, MediaRefs } from "./types";
import cloneDeep from "lodash.clonedeep";

const DEFAULT_MAX_CANVAS_SIZE = 512;

export const handleMediaClick = (
  draft: DraftState,
  point: Point,
  refs: MediaRefs,
  altKey: boolean,
  maxCanvasSize?: number,
  idx?: number
): DraftState => {
  let drawing: DrawingState = cloneDeep(draft.drawing);
  let removeIdx: number | undefined = idx;
  if (!refs.source.current) {
    throw "Did not find relevant media elements.";
  }
  const mediaViewerScale = parseFloat(
    getComputedStyle(refs.source.current).getPropertyValue(
      "--media-viewer-scale"
    ) || "1"
  );
  const mediaViewerDragging = parseFloat(
    getComputedStyle(refs.source.current).getPropertyValue(
      "--media-viewer-dragging"
    ) || "0"
  );
  if (mediaViewerDragging == 1) {
    return draft;
  }
  if (drawing.active && !drawing.active.editable) {
    // We have selected a pre-existing label and the user has
    // re-clicked. This results in de-selection.
    return {
      ...draft,
      drawing: { ...drawing, active: undefined },
      labels: {
        ...draft.labels,
        [drawing.mode]: [drawing.active.region, ...draft.labels[drawing.mode]],
      },
    };
  }
  if (drawing.mode == "masks") {
    if (!refs.canvas.current && !draft.canvas) {
      throw "Did not find necessary canvas element.";
    }
    const canvas =
      draft.canvas ||
      img2hsv(
        refs.source.current,
        refs.canvas.current!,
        maxCanvasSize || DEFAULT_MAX_CANVAS_SIZE
      );
    const image = {
      ...canvas,
      hsv: drawing.flood ? canvas.hsv : undefined,
    };
    if (drawing.mode === "masks" && drawing.flood && !image.hsv) {
      throw "Flood fill failed due to cross-origin media. Please disable flood fill.";
    }
    const fillOptions = {
      previous: drawing.active ? drawing.active.region.map : undefined,
      radius: {
        dx: drawing.radius / refs.source.current.clientWidth / mediaViewerScale,
        dy:
          drawing.radius / refs.source.current.clientHeight / mediaViewerScale,
      },
      threshold: drawing.threshold,
    };
    if (drawing.active) {
      // There's already an active mask and we are adding to it.
      drawing.active = {
        ...drawing.active,
        region: {
          ...drawing.active.region,
          map: {
            ...drawing.active.region.map,
            values:
              altKey && fillOptions.previous
                ? unfill(point, fillOptions.previous, fillOptions.radius)
                : fillHsv(point, image, fillOptions),
          },
        },
      };
    } else {
      // We are either creating a new mask or selecting an existing one.
      const maskIdx = findMaskByPoint(point, draft.labels.masks);
      if (maskIdx !== -1 && !altKey) {
        // We are selecting an existing one.
        drawing.active = {
          editable: false,
          region: draft.labels.masks[maskIdx],
        };
        removeIdx = maskIdx;
      } else {
        // We are creating a new one.
        drawing.active = {
          editable: true,
          region: {
            map: {
              dimensions: {
                width: canvas.width,
                height: canvas.height,
              },
              values: fillHsv(point, image, fillOptions),
            },
            labels: {},
          },
        };
      }
    }
    return {
      ...draft,
      canvas,
      drawing,
      labels: {
        ...draft.labels,
        [drawing.mode]: draft.labels[drawing.mode].filter(
          (_, i) => i !== removeIdx
        ),
      },
    };
  } else if (drawing.mode === "polygons") {
    if (drawing.active) {
      // We're adding a point to an existing polygon.
      drawing.active = {
        ...drawing.active,
        region: {
          ...drawing.active.region,
          points: drawing.active.region.points.concat([
            snapPolygonCoords(point, drawing, {
              width: refs.source.current.clientWidth * mediaViewerScale,
              height: refs.source.current.clientHeight * mediaViewerScale,
            }),
          ]),
        },
      };
    } else if (!altKey && idx !== undefined) {
      // We just selected a polygon.
      drawing.active = {
        region: draft.labels.polygons[idx],
        editable: false,
      };
    } else {
      // We are creating a brand new polygon.
      drawing.active = {
        region: { points: [point], labels: {} },
        editable: true,
      };
    }
    return {
      ...draft,
      drawing,
      labels: {
        ...draft.labels,
        [drawing.mode]: draft.labels[drawing.mode].filter(
          (_, i) => i !== removeIdx
        ),
      },
    };
  } else if (drawing.mode === "boxes") {
    if (drawing.active) {
      // We're changing an existing box.
      let pt1: Point;
      let pt2: Point;
      if (!drawing.active.region.pt2) {
        pt1 = drawing.active.region.pt1;
        pt2 = point;
      } else {
        const d1 = computeDistance(point, drawing.active.region.pt1);
        const d2 = computeDistance(point, drawing.active.region.pt2);
        if (d1 < d2) {
          // We're closer to pt1 than pt2, so leave pt2 alone and
          // change pt1.
          pt1 = point;
          pt2 = drawing.active.region.pt2;
        } else {
          pt1 = drawing.active.region.pt1;
          pt2 = point;
        }
      }
      drawing.active = {
        ...drawing.active,
        region: {
          ...drawing.active.region,
          pt1,
          pt2,
        },
      };
    } else if (!drawing.active && !altKey && idx !== undefined) {
      // We just selected a box.
      drawing.active = {
        region: draft.labels.boxes[idx],
        editable: false,
      };
    } else {
      // We are creating a brand new polygon.
      drawing.active = {
        region: { pt1: point, labels: {} },
        editable: true,
      };
    }
    return {
      ...draft,
      drawing,
      labels: {
        ...draft.labels,
        [drawing.mode]: draft.labels[drawing.mode].filter(
          (_, i) => i !== removeIdx
        ),
      },
    };
  }
  throw "Failed to handle media click operation.";
};

// Process change to a selection for a label.
/**
 * @param value - The value that has been selected.
 * @param selected - A list of current selected items.
 * @param multiple - Whether this field allows multiple selection.
 * @returns An updated list of selected values.
 */
export const processSelectionChange = (
  value: string,
  selected: string[] | undefined,
  multiple: boolean,
  required?: boolean
) =>
  selected && selected.indexOf(value) > -1
    ? multiple
      ? selected.filter((v) => v != value)
      : required
      ? selected
      : []
    : multiple
    ? (selected || []).concat([value])
    : [value];
