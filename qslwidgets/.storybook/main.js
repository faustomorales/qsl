const path = require("path");
module.exports = {
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [],
  features: {
    emotionAlias: false,
  },
  framework: "@storybook/react",
  staticDirs: ["../../qsl/testing/data"],
  webpackFinal: async (config, { configType }) => {
    config.resolve = {
      ...config.resolve,
      alias: {
        ...(config.resolve.alias || {}),
        svelte: path.resolve("node_modules", "svelte"),
      },
      extensions: (config.resolve.extensions || []).concat([
        ".mjs",
        ".js",
        ".svelte",
      ]),
      mainFields: (config.resolve.mainFields || []).concat([
        "svelte",
        "browser",
        "module",
        "main",
      ]),
    };
    config.module.rules = config.module.rules.concat([
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
    ]);
    return config;
  },
  core: {
    builder: "webpack5",
  },
};
