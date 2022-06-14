module.exports = {
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [],
  features: {
    emotionAlias: false
  },
  framework: "@storybook/react",
  staticDirs: ["../../qsl/testing/data"],
  core: {
    builder: "webpack5"
  }
};