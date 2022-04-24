const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const version = require("./package.json").version;
const defaults = {
  entry: "./src/index.ts",
  module: {
    rules: [
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
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: [".webpack.js", ".web.js", ".ts", ".js", ".tsx", "jsx"],
  },
};

module.exports = [
  /**
   * eel app
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
   * Embeddable lab bundle
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
];
