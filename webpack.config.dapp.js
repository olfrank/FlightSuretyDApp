const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
// const MiniCssExtractPlugin = require("mini-css-extract-plugin");
//const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = {
  entry: ['@babel/polyfill', path.join(__dirname, "src/dapp")],
  output: {
    path: path.join(__dirname, "prod/dapp"),
    filename: "bundle.js"
  },
  module: {
    rules: [
    {
        test: /\.(js|jsx)$/,
        use: "babel-loader",
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          'file-loader'
        ]
      },
      {
        test: /\.html$/,
        use: "html-loader",
        exclude: /node_modules/
      }
    ]
  },

  // optimization: {
  //   minimizer: [
  //     // For webpack@5 you can use the `...` syntax to extend existing minimizers (i.e. `terser-webpack-plugin`), uncomment the next line
  //       `...`,
  //     new CssMinimizerPlugin(),
  //   ],
  // },


  plugins: [
    new HtmlWebpackPlugin({ 
      template: path.join(__dirname, "src/dapp/index.html")
    }),
  ],
    // new MiniCssExtractPlugin({
    //   filename: '[name].css',
    //   chunkFilename: '[id].css',
    //   ignoreOrder: false,
    // }),

  resolve: {
    extensions: [".js"],
    fallback: {
        stream: require.resolve("stream-browserify"),
        crypto: require.resolve("crypto-browserify"),
        assert: require.resolve("assert/"),
        https: require.resolve("https-browserify"),
        http: require.resolve("stream-http"),
        url: require.resolve("url/"),
        os: require.resolve("os-browserify/browser")
        // stream: false,
        // crypto: false,
        // assert: false,
        // https: false,
        // http: false,
        // url: false,
        // os: false
    }
  },

  devServer: {
    //contentBase: path.join(__dirname, "dapp"),
    static: "/Users/OllieFrancis/Documents/UDACITYprojects/FlightSurety/src/dapp/",
    compress: true,
    port: 8000,
    //stats: "minimal"
  }
};