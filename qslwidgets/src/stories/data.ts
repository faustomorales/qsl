import type {
  Config,
  Labels,
  TimestampedLabel,
  IndexState,
  TimeSeriesTarget,
} from "../library/types";

export const images: {
  url: string | undefined;
  labels: Labels;
  metadata?: { [key: string]: string };
}[] = [
  {
    url: "image3.jpg",
    labels: {},
    metadata: {
      meta1: "value1",
      meta2: "value2",
      meta3: "value3",
      long: "abcdefghijklmnpqrstuvwxyz",
    },
  },
  { url: undefined, labels: {}, metadata: { meta1: "value2" } },
  {
    url: "image2.jpg",
    metadata: { foo: "bar" },
    labels: {
      image: {
        Category: ["outdoor"],
        Description: ["This is an initial description."],
      },
      boxes: [
        {
          pt1: { x: 0.25, y: 0.25 },
          pt2: { x: 0.75, y: 0.75 },
          labels: { Type: ["person"] },
          readonly: true,
        },
        {
          pt1: { x: 0.4, y: 0.4 },
          pt2: { x: 0.6, y: 0.6 },
          labels: { Type: ["place"] },
        },
        {
          pt1: { x: 0.8, y: 0.1 },
          pt2: { x: 0.9, y: 0.2 },
          labels: { Type: ["place"] },
        },
      ],
    },
  },
  { url: "not-an-image.jpg", labels: {} },
  { url: "image1.jpg", labels: {} },
  { url: "image4.jpg", labels: {} },
  { url: "image5.jpg", labels: {} },
  { url: "image6.jpg", labels: {} },
  { url: "image7.jpg", labels: {} },
  { url: "image8.jpg", labels: {} },
  { url: "image9.jpg", labels: {} },
  { url: "image10.jpg", labels: {} },
];

export const videos: { url: string; labels: TimestampedLabel[] }[] = [
  { url: "video1.m4v", labels: [] },
  { url: "video2.m4v", labels: [] },
];

export const config: Config = {
  image: [
    {
      name: "Category",
      options: [
        { name: "outdoor", displayName: "Outdoor", shortcut: "o" },
        { name: "indoor", displayName: "Indoor", shortcut: "i" },
      ],
      multiple: true,
      freeform: false,
    },
    {
      name: "Quality",
      options: [{ name: "low" }, { name: "high" }],
      multiple: false,
      freeform: true,
    },
    {
      name: "Description",
      freeform: true,
      multiple: false,
    },
  ],
  regions: [
    {
      name: "Type",
      options: [
        { name: "person", displayName: "Person", shortcut: "r" },
        { name: "place", displayName: "Place", shortcut: "l" },
        { name: "thing", displayName: "Thing", shortcut: "t" },
      ],
      multiple: false,
      freeform: false,
      required: true,
    },
  ],
};

export const indexState: IndexState = {
  rows: [
    {
      qslId: 0,
      target: "image2.jpg",
      labeled: "No",
      ignored: "No",
    },
    {
      qslId: 1,
      target: "https://picsum.photos/id/237/200/300",
      labeled: "Yes",
      ignored: "No",
    },
    {
      qslId: 2,
      target: "https://not.com/an/image.jpg",
      labeled: "No",
      ignored: "No",
    },
    { qslId: 3, target: "time series", labeled: "No", ignored: "No" },
    { qslId: 4, target: "numpy array", labeled: "No", ignored: "No" },
    {
      qslId: 5,
      target: "https://picsum.photos/id/239/200/300",
      labeled: "No",
      ignored: "No",
    },
    {
      qslId: 6,
      target: "https://picsum.photos/id/1025/500/500",
      labeled: "No",
      ignored: "No",
    },
  ],
  columns: [
    { field: "target", type: "string", headerName: "Target" },
    { field: "labeled", type: "string", headerName: "Labeled" },
    { field: "ignored", type: "string", headerName: "Ignored" },
  ],
  rowCount: 14,
  page: 0,
  rowsPerPage: 7,
  sortModel: [],
  filterModel: [],
};

const base = Array(100)
  .fill(0)
  .map((v, i) => i);
export const timeSeries: TimeSeriesTarget[] = [
  {
    filename: "chart",
    plots: [
      {
        x: { name: "name", values: base.map((i) => i), limits: [-5, 102] },
        y: {
          precision: {
            left: 3,
          },
          animation: 100,
          limits: {
            left: [-10, 203],
            right: [-5, 301],
          },
          labels: {
            left: "uv",
            right: "pv",
          },
          lines: [
            {
              name: "uv",
              axis: "left",
              color: "blue",
              style: "stroke-width:10; stroke: purple; stroke-opacity: 50%",
              values: base.map((i) => i * 2 + 3),
              dot: {
                labelKey: "uvs",
                labelMaxCount: 2,
              },
              annotations: [{ x: 41, radius: 6, style: "fill-opacity: 0" }],
            },
            {
              name: "pv",
              axis: "right",
              color: "green",
              values: base.map((i) => i * 3 + 1),
            },
          ],
        },
        size: {
          width: 1024,
          height: 512,
        },
        areas: [
          {
            x1: 2.1,
            x2: 3.5,
            label: "hello!",
            labelKey: "kind",
            labelVal: "foo",
          },
        ],
      },
    ],
  },
  {
    plots: [
      {
        x: {
          name: "x",
          values: [0, 1, 2, 3],
        },
        y: {
          lines: [
            {
              name: "foo",
              values: [0, 2, 4, 6],
              dot: {
                labelKey: "Peaks",
              },
            },
          ],
        },
        size: {
          width: 512,
          height: 256,
        },
        areas: [],
      },
    ],
  },
];

export const timeSeriesConfig = {
  image: [
    { name: "kind", freeform: true, multiple: false },
    { name: "uvs", freeform: true, multiple: true },
  ],
};
