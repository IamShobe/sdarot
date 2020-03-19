const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {spawn} = require('child_process');

const src = path.resolve(__dirname, 'frontend', 'src');
const dist = path.join(__dirname, 'frontend', 'dist');

module.exports = {
    devtool: "eval-source-map",
    output: {
        filename: "static/[name].js",
        path: dist,
        publicPath: "/"
    },
    entry: {
        hotLoader: 'react-hot-loader/patch',
        main: path.resolve(src, 'index.js')
    },
    devServer: {
        contentBase: dist,
        publicPath: '/',
        host: "0.0.0.0",
        disableHostCheck: true,
        historyApiFallback: true,
        port: 9002,
        hot: true,
        before() {
            spawn(
                'electron', ['.'],
                {shell: true, env: process.env, stdio: 'inherit'}
            )
                .on('close', code => process.exit(0))
                .on('error', spawnError => console.error(spawnError))
        },
        proxy: {
            '/api/**': {
                target: 'http://0.0.0.0:5002',
            },
            '/socket.io/**': {
                target: 'http://0.0.0.0:5002',
            },

        },
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(src, 'index.html')
        }),
    ],
    resolve: {
        extensions: ['.js', '.jsx'],
        alias: {
            'react-dom': '@hot-loader/react-dom',
            "~": path.resolve(src),
        }
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.inline.svg$/,
                loader: 'react-svg-loader',
            },
            {
                test: /^(?!.*\.inline\.svg$).*\.svg$/,
                loader: 'svg-url-loader',
                options: {
                    limit: 10000,
                    name: '[name].[ext]',
                    outputPath: 'static/avatars/',
                    publicPath: '/static/avatars/',
                },
            },
            {
                test: /\.(jpe?g|png|gif)$/i,
                loader: 'file-loader',
                options: {
                    name: '[name].[ext]',
                    outputPath: 'static/img/',
                    publicPath: '/static/img/',
                },
            },
            {
                test: /\.(ttf)$/i,
                loader: 'file-loader',
                options: {
                    name: '[name].[ext]',
                    outputPath: 'static/font/',
                    publicPath: '/static/font/',
                },
            },
            {
                test: /\.(scss|css)$/,
                use: ['style-loader', 'css-loader', 'sass-loader'],
            },
        ],
    },
    optimization: {
        runtimeChunk: true,
        splitChunks: {
            cacheGroups: {
                vendor: {
                    test: /node_modules/,
                    chunks: 'initial',
                    name: 'vendor',
                    enforce: true
                },
            }
        }
    }
}