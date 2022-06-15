const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const version = require("./package.json").version;
const builder = require("@jupyterlab/builder/lib/extensionConfig").default;

module.exports = (env) => {
  const mode = env.production ? "production" : "development";
  const watch = env.development;
  const defaults = {
    entry: "./src/index.ts",
    mode,
    watch,
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
        { test: /\.ts$/, loader: "ts-loader" },
        { test: /\.[t|j]sx$/, loader: "babel-loader" },
        { test: /\.js$/, loader: "source-map-loader" },
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
    ignoreWarnings: [/Failed to parse source map/],
    devtool: "source-map",
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
  const [embedder] = builder({
    packagePath: path.resolve(__dirname),
    corePath: path.resolve(
      __dirname,
      "..",
      ".venv",
      "lib",
      "python3.7",
      "site-packages",
      "jupyterlab",
      "staging"
    ),
    mode,
    watchMode: watch,
  });
  return [
    /**
     * documentation
     */
    {
      ...defaults,
      entry: "./src/Documentation.tsx",
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

    /**
     * eel app
     */
    {
      ...defaults,
      entry: "./src/EelWidget.tsx",
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

    /**
     * Notebook extension
     */
    {
      ...defaults,
      output: {
        filename: "index.js",
        path: path.resolve(__dirname, "..", "qsl", "ui", "nbextension"),
        libraryTarget: "amd",
        publicPath: "",
      },
    },

    /**
     * Public package
     */
    {
      ...defaults,
      output: {
        filename: "index.js",
        path: path.resolve(__dirname, "dist"),
        libraryTarget: "amd",
        library: "qsl",
        publicPath: "https://unpkg.com/qsl@" + version + "/dist/",
      },
    },

    /**
     * Lab bundle embedder
     */
    embedder,
  ];
};
