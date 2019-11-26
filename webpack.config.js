const path = require("path");
const webpack = require("webpack");

const libPath = path.join(__dirname, "client");
const wwwPath = path.join(__dirname, "dist");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const pkg = require("./package.json");

const isDev = process.env.NODE_ENV !== "production";

if (isDev) {
    module.exports = {
        mode: "development",
        devtool: "inline-source-map",
        entry: path.join(libPath, "/app/app.module.js"),
        output: {
            path: path.join(wwwPath),
            filename: "bundle.js"
        },
        module: {
            rules: [
                {
                    test: /\.html$/,
                    use: [{ loader: "raw-loader" }]
                },
                {
                    test: /\.(png|jpg)$/,
                    use: [
                        {
                            loader: "file-loader",
                            options: { name: "img/[name].[ext]" }
                        }
                    ]
                },
                {
                    test: /\.scss$/,
                    use: ["style-loader", "css-loader", "sass-loader"]
                },
                {
                    test: /\.css$/,
                    use: ["style-loader", "css-loader"]
                },
                {
                    test: /\.js$/,
                    exclude: /(node_modules)/,
                    use: [{ loader: "babel-loader" }]
                },
                {
                    test: [
                        /fontawesome-webfont\.svg/,
                        /fontawesome-webfont\.eot/,
                        /fontawesome-webfont\.ttf/,
                        /fontawesome-webfont\.woff/,
                        /fontawesome-webfont\.woff2/
                    ],
                    use: [
                        {
                            loader: "file-loader",
                            options: { name: "fonts/[name].[ext]" }
                        }
                    ]
                },
                {
                    test: /\.(ttf|otf|eot|svg|woff(2)?)$/,
                    use: [{ loader: "url-loader" }]
                }
            ]
        },
        plugins: [
            new webpack.ProvidePlugin({
                "window.Masonry": "Masonry"
            }),

            // HtmlWebpackPlugin: Simplifies creation of HTML files to serve your webpack bundles : https://www.npmjs.com/package/html-webpack-plugin
            new HtmlWebpackPlugin({
                filename: "index.html",
                pkg: pkg,
                template: path.join(libPath, "index.ejs"),
                inject: true
            })
        ]
    };
} else {
    module.exports = {
        entry: path.join(libPath, "/app/app.module.js"),
        context: path.resolve(__dirname, "./client"),
        output: {
            filename: "bundle.[hash].js",
            hashDigestLength: 7,
            path: path.join(wwwPath),
            publicPath: "/"
        },
        module: {
            rules: [
                {
                    test: /\.html$/,
                    use: [{ loader: "raw-loader" }]
                },
                {
                    test: /\.(png|jpg)$/,
                    use: [
                        {
                            loader: "file-loader",
                            options: { name: "img/[name].[ext]" }
                        }
                    ]
                },
                {
                    test: /\.scss$/,
                    use: ["style-loader", "css-loader", "sass-loader"]
                },
                {
                    test: /\.css$/,
                    use: ["style-loader", "css-loader"]
                },
                {
                    test: /\.js$/,
                    exclude: /(node_modules)/,
                    use: [{ loader: "babel-loader" }]
                },
                {
                    test: [
                        /fontawesome-webfont\.svg/,
                        /fontawesome-webfont\.eot/,
                        /fontawesome-webfont\.ttf/,
                        /fontawesome-webfont\.woff/,
                        /fontawesome-webfont\.woff2/
                    ],
                    use: [
                        {
                            loader: "file-loader",
                            options: { name: "fonts/[name].[ext]" }
                        }
                    ]
                },
                {
                    test: /\.(ttf|otf|eot|svg|woff(2)?)$/,
                    use: [{ loader: "url-loader" }]
                }
            ]
        },
        plugins: [
            new webpack.DefinePlugin({
                "process.env.NODE_ENV": JSON.stringify("production")
            }),

            new webpack.ProvidePlugin({
                "window.Masonry": "Masonry"
            }),

            new webpack.optimize.CommonsChunkPlugin("common.js"),
            new webpack.optimize.UglifyJsPlugin({
                sourceMap: true,
                compress: { warnings: true }
            }),
            new webpack.optimize.AggressiveMergingPlugin(),
            new CompressionPlugin({
                asset: "[path].gz[query]",
                algorithm: "gzip",
                test: /\.js$|\.css$|\.html$/,
                threshold: 10240,
                minRatio: 0.8
            }),

            // HtmlWebpackPlugin: Simplifies creation of HTML files to serve your webpack bundles : https://www.npmjs.com/package/html-webpack-plugin
            new HtmlWebpackPlugin({
                filename: "index.html",
                pkg: pkg,
                template: path.join(libPath, "index.ejs"),
                inject: true
            })
        ]
    };
}
