const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const version = require("./package.json").version;
const builder = require("@jupyterlab/builder/lib/extensionConfig").default;

module.exports = (env) => {
  const mode = env.production ? "production" : "development";
  const watch = !env.production;
  const defaults = {
    entry: "./lib/index.js",
    mode,
    module: {
      rules: [
        {
          test: /\.svelte$/,
          use: {
            loader: "svelte-loader",
            options: {
              preprocess: require("svelte-preprocess")(),
            },
          },
          include: path.resolve(__dirname, "../"),
        },
        {
          // required to prevent errors from Svelte on Webpack 5+, omit on Webpack 4
          test: /node_modules\/svelte\/.*\.mjs$/,
          resolve: {
            fullySpecified: false,
          },
        },
        { test: /\.js$/, loader: "source-map-loader" },
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
    ignoreWarnings: [
      /Failed to parse source map/,
      /No required version specified/,
    ],
    devtool: mode === "development" ? "source-map" : false,
    externals: ["@jupyter-widgets/base"],
    resolve: {
      alias: {
        svelte: path.resolve("node_modules", "svelte"),
      },
      mainFields: ["svelte", "browser", "module", "main"],
      extensions: [
        ".webpack.js",
        ".web.js",
        ".ts",
        ".js",
        ".tsx",
        ".jsx",
        ".svelte",
        ".mjs",
      ],
    },
  };
  const targets = {
    labwidget: builder({
      packagePath: path.resolve(__dirname),
      corePath: path.resolve(
        __dirname,
        "..",
        ".venv",
        "lib",
        "python3.11",
        "site-packages",
        "jupyterlab",
        "staging"
      ),
      mode,
      watchMode: watch,
      devtool: mode === "development" ? "source-map" : false,
    })[0],
    nbwidget: {
      ...defaults,
      output: {
        filename: "index.js",
        path: path.resolve(__dirname, "..", "qsl", "ui", "nbextension"),
        libraryTarget: "amd",
        publicPath: "",
      },
    },
    eelwidget: {
      ...defaults,
      entry: "./lib/widgets/Eel.js",
      output: {
        filename: "index.js",
        path: path.resolve(__dirname, "..", "qsl", "ui", "eelapp"),
      },
      plugins: [
        new HtmlWebpackPlugin({
          template: "./src/eel.html",
          filename: "index.html",
        }),
      ],
    },
    documentation: {
      ...defaults,
      entry: "./lib/Documentation.js",
      output: {
        filename: "index.js",
        path: path.resolve(__dirname, "..", "docs"),
      },
      plugins: [
        new HtmlWebpackPlugin({
          template: "./src/docs.html",
          filename: "index.html",
        }),
      ],
    },
    public: {
      ...defaults,
      output: {
        filename: "index.js",
        path: path.resolve(__dirname, "dist"),
        libraryTarget: "amd",
        library: "qsl",
        publicPath: "https://unpkg.com/qsl@" + version + "/dist/",
      },
    },
  };
  targets.labwidget.module.rules = targets.labwidget.module.rules.concat(
    defaults.module.rules.slice(0, 2) // Only add the svelte bits.
  );
  return [
    targets.labwidget,
    targets.nbwidget,
    targets.eelwidget,
    //targets.documentation,
    targets.public,
  ];
};
