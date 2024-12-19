const webpack = require('webpack');
const LavaMoatPlugin = require('@lavamoat/webpack')
const fs = require('fs');
const path = require('path');

module.exports = function override(config, env) {
  config.optimization = {
    ...config.optimization,
    minimize: false,
    concatenateModules: false
  };

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
    vm: require.resolve('vm-browserify'),
    path: require.resolve("path-browserify"),
  };

  // Configure module resolution
  config.resolve = {
    ...config.resolve,
    mainFields: ['browser', 'module', 'main'],
    conditionNames: ['require', 'browser', 'default']
  };

  // Add a rule to inject debug logs into axios-related files
  config.module.rules.push({
    test: /[\\/]axios[\\/].*\.js$/,
    use: [
      {
        loader: 'babel-loader',
        options: {
          plugins: [
            '@babel/plugin-transform-modules-commonjs',
            ['@babel/plugin-transform-runtime', {
              helpers: false,
              regenerator: true
            }]
          ]
        }
      }
    ]
  });

  config.module.rules.push({
    test: /\.m?js/,
    resolve: {
      fullySpecified: false
    }
  });

  config.plugins = [
    new LavaMoatPlugin({
      generatePolicy: true,
      HtmlWebpackPluginInterop: true,
      readableResourceIds: true,
      diagnosticsVerbosity: 1,
      lockdown: {
        consoleTaming: 'unsafe',
        errorTrapping: 'none',
        unhandledRejectionTrapping: 'none',
        overrideTaming: 'severe',
      }
    }),
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
      path: ['path-browserify', 'default']
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env)
    })
  ];

  return config;
}
