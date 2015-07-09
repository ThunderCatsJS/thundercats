var webpack = require('webpack');
var pkg = require('./package.json');

var banner = [
  '/*',
  ' * ThunderCats - ' + pkg.description,
  ' * @version v' + pkg.version,
  ' * @link ' + pkg.homepage,
  ' * @license ' + pkg.license,
  ' * @author ' + pkg.author.name + ' (' + pkg.author.url + ')',
  '*/\n'
].join('\n');

module.exports = {

  output: {
    library: 'ThunderCats',
    libraryTarget: 'umd'
  },

  externals: [
    {
      react: {
        root: 'React',
        commonjs2: 'react',
        commonjs: 'react',
        amd: 'react'
      },
      rx: {
        root: 'Rx',
        commonjs2: 'rx',
        commonjs: 'rx',
        amd: 'rx'
      }
    }
  ],

  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      }
    ]
  },

  node: {
    Buffer: false
  },

  resolve: {
    extensions: [
      '',
      '.js',
      '.jsx'
    ]
  },

  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    }),
    new webpack.BannerPlugin(banner, { raw: true, entryOnly: true })
  ]
};
