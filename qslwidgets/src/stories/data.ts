import {
  Config,
  Labels,
} from "../react-image-labeler/components/library/types";

export const images: {
  url: string | undefined;
  labels: Labels;
  metadata?: { [key: string]: string };
}[] = [
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
  { url: "image1.jpg", labels: {} },
  { url: "image3.jpg", labels: {} },
  { url: "image4.jpg", labels: {} },
  { url: "image5.jpg", labels: {} },
  { url: "image6.jpg", labels: {} },
  { url: "image7.jpg", labels: {} },
  { url: "image8.jpg", labels: {} },
  { url: "image9.jpg", labels: {} },
  { url: "image10.jpg", labels: {} },
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
