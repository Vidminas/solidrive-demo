const path = require("path");
const webpack = require("webpack");

module.exports = {
   mode: "development",
   entry: {
    "index": "./src/index.js",
    "clicker": "./src/clicker.js",
    "setup": "./src/setup.js"
   },
   output: {
     path: path.resolve(__dirname, "dist"), 
     filename: "build/[name].js" 
   },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [ { loader: "style-loader" }, { loader: "css-loader" } ],
      },
      {
        test: require.resolve("jquery"),
        loader: "expose-loader",
        options: {
          exposes: ["$", "jQuery"],
        },
      },
    ]
  },
  resolve: {
    fallback: {
      "assert": require.resolve("assert"),
      "crypto": require.resolve("crypto-browserify"),
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "stream": require.resolve("stream-browserify"),
      "url": require.resolve("url"),
      "util": require.resolve("util"),
      "v8": require.resolve("v8")
    } 
  },
  plugins: [
    new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
    })
  ],
  devServer: {
    static: "./dist",
    allowedHosts: ["solidclient.azurewebsites.net"]
  }
};