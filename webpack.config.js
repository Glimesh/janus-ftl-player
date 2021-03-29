const webpack = require('webpack');
const path = require('path');

module.exports = {
    entry: './src/index.ts',
    plugins: [
        // janus.js does not use 'import' to access to the functionality of webrtc-adapter,
        // instead it expects a global object called 'adapter' for that.
        // Let's make that object available.
        new webpack.ProvidePlugin({
            adapter: ['webrtc-adapter', 'default']
        })
    ],
    module: {
        rules: [
            // janus.js does not use 'export' to provide its functionality to others, instead
            // it creates a global variable called 'Janus' and expects consumers to use it.
            // Let's use 'exports-loader' to simulate it uses 'export'.
            {
                test: require.resolve('janus-gateway-mirror'),
                loader: 'exports-loader',
                options: {
                    exports: 'Janus',
                },
            },
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            }
        ]
    },
    resolve: {
        extensions: ['.txs', '.ts', '.js']
    },
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        library: 'JanusFtlPlayer',
        umdNamedDefine: true
    },
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: false,
        port: 9000
    }
};