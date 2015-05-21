// webpack.config.js
module.exports = {
  entry: './www/js/CustomerOrder.js',
  output: {
    path: __dirname + "/www/js",
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      { test: /\.js$/, loader: 'jsx-loader?harmony' },
      { test: /\.css$/, loader: 'style-loader!css-loader' },
    ]
  },
    resolve: {
            extensions: ['', '.js', '.htm']
        }
};
