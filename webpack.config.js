const path = require("path");
module.exports = {
   mode: "development",
   entry: {
    "index": "./src/index.js",
    "clicker": "./src/clicker.js",
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
    ]
  },
  devServer: {
    static: "./dist",
    allowedHosts: [
        'solidclient.azurewebsites.net'
    ]
  }
};