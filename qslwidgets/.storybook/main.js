const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");
const path = require("path");

module.exports = {
  stories: [
    "../src/**/*.stories.mdx",
    "../src/**/*.stories.@(js|jsx|ts|tsx|svelte)",
  ],
  addons: [],
  framework: "@storybook/svelte",
  svelteOptions: {
    preprocess: require("svelte-preprocess")(),
  },
  core: {
    builder: "webpack5",
  },
  staticDirs: ["../../qsl/testing/data"],
  webpackFinal: async (config) => {
    config.plugins.push(
      new WasmPackPlugin({
        crateDirectory: path.resolve(__dirname, "..", "wasmtools"),
        outDir: path.resolve(__dirname, "..", "src", "library", "wasmtools"),
        outName: "index",
        extraArgs: "--target web",
        forceWatch: true,
      })
    );
    return config;
  },
};
