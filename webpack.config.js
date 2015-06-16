var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  devtool: 'sourcemap',
  entry: './docs/index.jsx',
  output: {
    filename: 'bundle.js',
    path: path.join(__dirname, '/assets'),
    publicPath: 'assets/'
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loaders: [
          'babel-loader'
        ],
        include: path.join(__dirname, 'docs')
      },
      {
        test: /\.json?$/,
        loaders: [
          'json-loader'
        ]
      },
      {
        test: /\.css?$/,
        loader: ExtractTextPlugin.extract('css-loader')
      }
    ]
  },
  plugins: [
    new ExtractTextPlugin('bundle.css')
  ]
};
