const path = require('path');

module.exports = {
    entry: {
        'gcdn-perf.js': './src/gcdn-perf.js',
    },
    mode: 'development',
    resolve: {
        extensions: ['.js'],
        alias: {},
    },
    devtool: false,
    optimization: {
        minimize: true
    },
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name]',
    },
    module: {
        rules: [
            {
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            },
        ],
    }
};
