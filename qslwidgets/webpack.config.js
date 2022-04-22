const path = require('path');
const version = require('./package.json').version;
const defaults = {
  entry: './src/index.ts',
  module: {
    rules: [
      { test: /\.ts$/, loader: 'ts-loader' },
      { test: /\.[t|j]sx$/, loader: 'babel-loader' },
      { test: /\.js$/, loader: 'source-map-loader' },
    ],
  },
  ignoreWarnings: [/Failed to parse source map/],
  devtool: 'source-map',
  externals: ['@jupyter-widgets/base'],
  resolve: {
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: ['.webpack.js', '.web.js', '.ts', '.js', '.tsx', 'jsx'],
  },
};

module.exports = [
  /**
   * Notebook extension
   *
   * This bundle only contains the part of the JavaScript that is run on load of
   * the notebook.
   */
  {
    ...defaults,
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, '..', 'qsl', 'ui', 'nbextension'),
      libraryTarget: 'amd',
      publicPath: '',
    },
  },

  /**
   * Embeddable qsl bundle
   *
   * This bundle is almost identical to the notebook extension bundle. The only
   * difference is in the configuration of the webpack public path for the
   * static assets.
   *
   * The target bundle is always `dist/index.js`, which is the path required by
   * the custom widget embedder.
   */
  {
    ...defaults,
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'amd',
      library: 'qsl',
      publicPath: 'https://unpkg.com/qsl@' + version + '/dist/',
    },
  },
];
