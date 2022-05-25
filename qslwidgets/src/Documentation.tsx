import React from "react";
import ReactDOM from "react-dom";
import Highlight from "react-highlight";

import {
  Box,
  Container,
  Paper,
  Typography,
  ThemeProvider,
  CssBaseline,
  Tabs,
  Tab,
  createTheme,
  useMediaQuery,
} from "@mui/material";

import {
  Demonstrator,
  BatchImageLabeler,
  VideoLabeler,
  ImageLabeler,
  Labeler,
  Labels,
  Config,
  TimestampedLabel,
} from "./react-image-labeler";

import "highlight.js/styles/agate.css";
import "./docs.css";

const images: {
  url: string;
  labels: Labels;
  metadata?: { [key: string]: string };
}[] = [
  {
    url: "image1.jpg",
    metadata: { foo: "bar" },
    labels: {
      image: { Category: ["outdoor"] },
      boxes: [
        {
          pt1: { x: 0.2, y: 0.2 },
          pt2: { x: 0.5, y: 0.55 },
          labels: { Type: ["place"] },
        },
      ],
    },
  },
  { url: "image2.jpg", labels: {} },
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
      freeform: true,
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
    },
  ],
};

export const LabelingImages: React.FC = () => {
  const [state, setState] = React.useState({
    src: images[0].url,
    labels: images[0].labels,
    metadata: images[0].metadata,
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
            y: -3,
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
          metadata={state.metadata}
          config={state.config}
          labels={state.labels}
          target={state.src}
          options={{ maxViewHeight: 256 }}
        />
      </Labeler>
    </Demonstrator>
  );
};

export const LabelingVideos: React.FC = () => {
  const [state, setState] = React.useState({
    src: "bigbuckbunny-excerpt.mp4",
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
          url: "",
          labels: {},
          metadata: {
            Comment:
              "You don't have to have an image to label. You can label arbitrary metadata, too!",
          },
        },
      ])
      .map((i: any, iIdx: number) => {
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
          columns={2}
          target={state.target.map((t) => t.url)}
          config={config}
          states={state.target.map((t) => {
            return {
              ...t,
              metadata: t.metadata as any,
              labels: { image: t.labels.image, boxes: [] },
            };
          })}
          setStates={(target) =>
            setState({
              ...state,
              target: target.map((t, tIdx) => {
                return { ...t, url: state.target[tIdx].url };
              }) as any,
            })
          }
          labels={state.target.find((t) => t.visible && t.selected)?.labels}
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

const snippets = {
  image: {
    cli: `$ qsl label labels.json *.jpg`,
    notebook: `import qsl
from IPython.display import display

# You can get the current state of the
# labels from \`labeler.items\` (i.e., to save them somewhere)
labeler = qsl.MediaLabeler(
  items=[{ "target": "path/img.jpg", "metadata": { "foo": "bar" } }],
  # Optionally, provide an intial config (you can edit it in the UI).
  config={"image": [
    {
      "name": "Category",
      "options": [{ "name": "Outdoor" }, { "name": "Indoor" }],
      "multiple": True
    }
  ]}
  # Optionally, pass a path to a JSON file that you want
  # labels to be saved to.
  jsonpath="labels.json"
)
display(labeler)
`,
  },
  batch: {
    cli: `$ qsl label -b 8 labels.json *.jpg`,
    notebook: `import qsl
from IPython.display import display

labeler = qsl.MediaLabeler(
  items=[{"target": "path/img.jpg"}],
  jsonpath="labels.json",
  batchSize=8
)
display(labeler)`,
  },
  video: {
    cli: `$ qsl label labels.json *.mp4`,
    notebook: `import qsl
from IPython.display import display

labeler = qsl.MediaLabeler(
  items=[{"target": "path/video.mp4", "type": "video"}],
  jsonpath="labels.json"
)
display(labeler)
`,
  },
};

const LogoVertical: React.FC<{
  acronymStyle: { color: string; fontWeight: number };
}> = ({ acronymStyle }) => (
  <Box>
    <Typography variant="h2" sx={{ p: 0, m: 0 }} style={{ lineHeight: 0.95 }}>
      <span style={acronymStyle}>Q</span>uick +
    </Typography>
    <Typography variant="h2" sx={{ p: 0, m: 0 }} style={{ lineHeight: 0.95 }}>
      <span style={acronymStyle}>S</span>imple
    </Typography>
    <Typography variant="h2" sx={{ p: 0, m: 0 }} style={{ lineHeight: 0.95 }}>
      <span style={acronymStyle}>L</span>abeler
    </Typography>
  </Box>
);

const LogoHorizontal: React.FC<{
  acronymStyle: { color: string; fontWeight: number };
}> = ({ acronymStyle }) => (
  <Box>
    <Typography variant="h2" sx={{ p: 0, m: 0 }} style={{ lineHeight: 0.95 }}>
      <span style={acronymStyle}>Q</span>uick +{" "}
      <span style={acronymStyle}>S</span>imple{" "}
      <span style={acronymStyle}>L</span>abeler
    </Typography>
  </Box>
);

const ExampleElement: React.FC<{
  snippet: { notebook: string; cli: string };
  demonstration: React.ReactNode;
  description: React.ReactNode;
}> = ({ demonstration, description, snippet }) => {
  const theme = createTheme({ palette: { mode: "light" } });
  const large = useMediaQuery(theme.breakpoints.up("md"));
  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: large ? `1fr 2fr` : `1fr`,
          columnGap: 2,
          pb: 2,
          width: "100%",
        }}
      >
        <Box sx={{ pt: 2 }}>{description}</Box>
        <Box sx={{ overflow: "scroll" }}>
          <Typography variant="caption" sx={{ px: 0, pt: 0, pb: 1 }}>
            Command Line
          </Typography>
          <Highlight className="shell">{snippet.cli}</Highlight>
          <Typography variant="caption" sx={{ px: 0, pt: 0, pb: 1 }}>
            Notebook
          </Typography>
          <Highlight className="python">{snippet.notebook}</Highlight>
        </Box>
      </Box>
      <Paper elevation={5} sx={{ my: 2, width: "100%", p: 2 }}>
        <Box>{demonstration}</Box>
      </Paper>
    </Box>
  );
};

const DescriptionList: React.FC<
  {
    entries: { title: string | React.ReactNode; description: string }[];
  } & React.ComponentProps<"ul">
> = ({ entries, ...props }) => {
  return (
    <ul {...props}>
      {entries.map((e, i) => (
        <li key={i}>
          <b>{e.title}</b>
          <br />
          {e.description}
        </li>
      ))}
    </ul>
  );
};

const App: React.FC = () => {
  const theme = createTheme();
  const large = useMediaQuery(theme.breakpoints.up("md"));
  const [page, setPage] = React.useState(0);
  const tabs = [
    {
      name: "Images",
      id: "images",
      component: (
        <ExampleElement
          snippet={snippets.image}
          demonstration={<LabelingImages />}
          description={
            <Box>
              <Typography variant="body1">
                Label images easily and quickly.
              </Typography>
              <DescriptionList
                style={{ paddingLeft: "15px" }}
                entries={[
                  {
                    title: "Label images hosted almost anywhere.",
                    description:
                      "Your target can be a file from disk, the web, S3 (use an s3://bucket/key URL). If your image is in memory, just pass a numpy array with shape (height, width, channels).",
                  },
                  {
                    title: "Show metadata with images",
                    description:
                      "Include contextual information about the given image in the labeling interface by adding a metadata object. If you don't specify a target, the metadata will still be shown (useful if you're labeling something other than images/videos).",
                  },
                  {
                    title:
                      "Configure labeling programmatically or from within the UI.",
                    description:
                      "The interface allows you to add or modify labeling configurations on-the-fly.",
                  },
                ]}
              />
            </Box>
          }
        />
      ),
    },
    {
      name: "Videos",
      id: "videos",
      component: (
        <ExampleElement
          snippet={snippets.video}
          demonstration={<LabelingVideos />}
          description={
            <Box>
              <Typography variant="body1">
                Video labeling supports all of the same features as image
                labeling, in addition to allowing you to label specific frames
                or segments.
              </Typography>
              <DescriptionList
                style={{ paddingLeft: "15px" }}
                entries={[
                  {
                    title: "Label frames or segments.",
                    description:
                      "Click on the timeline to scrub back and forth. Alt-Click to select an end frame, if desired.",
                  },
                  {
                    title:
                      "Supports any video supported by the HTML video element.",
                    description: "This means you can also label audio.",
                  },
                  {
                    title: "Mix and match videos and images.",
                    description:
                      "The labeler will automatically switch between the video and image labeling interface.",
                  },
                ]}
              />
            </Box>
          }
        />
      ),
    },
    {
      name: "Batches",
      id: "batches",
      component: (
        <ExampleElement
          snippet={snippets.batch}
          demonstration={<LabelingBatches />}
          description={
            <Box>
              <Typography variant="body1">
                Have a lot of images you want to label quickly? QSL supports
                batching images together.
              </Typography>
              <DescriptionList
                style={{ paddingLeft: "15px" }}
                entries={[
                  {
                    title: "Customize the number of images in each batch.",
                    description:
                      "Choose your batch size based on your specific problem.",
                  },
                  {
                    title: "Skip through batches quickly.",
                    description:
                      "If many of your images will have the same label, you can skip through a large dataset very quickly.",
                  },
                  {
                    title: "Mix and match videos and images.",
                    description:
                      "If you include videos, those will be automatically switched into labeling one at a time.",
                  },
                ]}
              />
            </Box>
          }
        />
      ),
    },
  ];
  const acronymStyle = {
    color: theme.palette.primary.main,
    fontWeight: 800,
  };
  return (
    <ThemeProvider theme={theme}>
      <Container>
        <Box
          sx={{
            pt: 2,
            display: "grid",
            gridTemplateColumns: large ? `215px 1fr` : `1fr`,
            columnGap: 2,
          }}
        >
          <Box>
            {large ? (
              <LogoVertical acronymStyle={acronymStyle} />
            ) : (
              <LogoHorizontal acronymStyle={acronymStyle} />
            )}
            <Typography variant="subtitle1">
              An <a href="https://github.com/faustomorales/qsl">open-source</a>{" "}
              Python library for labeling images, videos, and more.
            </Typography>
            <Box sx={{ py: 1 }}>
              <Highlight className="shell">$ pip install qsl</Highlight>
            </Box>
          </Box>
          <Box>
            <DescriptionList
              style={{ paddingLeft: "15px", margin: 0 }}
              entries={[
                {
                  title: (
                    <span>
                      Label images right from Jupyter or{" "}
                      <a href="https://colab.research.google.com/drive/1FUFt3fDs7BYpGI1E2z44L-zSRdoDtF8O?usp=sharing">
                        Google Colab
                      </a>
                    </span>
                  ),
                  description:
                    "If you're already working with your data in a notebook, why leave to do your labeling elsewhere? And if you do prefer to work separately, qsl provides a command line tool for running a standalone web server to label the images using the same interface.",
                },
                {
                  title: "Simple enough for labeling small datasets",
                  description:
                    "You don't have to be labeling a massive dataset for QSL to be useful. It's easy enough to use for doing one-off error analysis or reviewing inferences from a model.",
                },
                {
                  title: "Sophisticated enough for large datasets",
                  description:
                    "QSL has tools to make labeling less painful. It has keyboard shortcuts for key functions and creates shortcuts for your labels automatically. Zoom and pan naturally using the track pad. The region annotation tools have enhancements like optional flood filling for segmentation maps and snapping for polygons.",
                },
              ]}
            />
          </Box>
        </Box>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={page}
            onChange={(event, page) => setPage(page)}
            aria-label="basic tabs example"
            variant="fullWidth"
          >
            {tabs.map((t, i) => (
              <Tab
                label={t.name}
                key={t.id}
                id={`tab-${t.id}`}
                aria-controls={`tabpanel-${t.id}`}
              />
            ))}
          </Tabs>
        </Box>
        {tabs.map((t, i) => (
          <Box hidden={i !== page} key={t.id}>
            {t.component}
          </Box>
        ))}
      </Container>
    </ThemeProvider>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <CssBaseline>
      <App />
    </CssBaseline>
  </React.StrictMode>,
  document.getElementById("root")
);
