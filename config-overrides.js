const webpack = require('webpack');

module.exports = function override(config, env) {
    config.resolve.fallback = {
        url: require.resolve('url'),
        fs: require.resolve('fs'),
        assert: require.resolve('assert'),
        crypto: require.resolve('crypto-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        buffer: require.resolve('buffer'),
        stream: require.resolve('stream-browserify'),
        path: require.resolve('path-browserify'),
        vm: require.resolve('vm-browserify'),
    };

    config.plugins = [
        ...config.plugins,
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
        }),
        new webpack.DefinePlugin({
            'process.env': JSON.stringify(process.env),
        }),
    ];

    config.module.rules.push({
        test: /\.m?js/,
        resolve: {
            fullySpecified: false
        }
    });

    return config;
}
