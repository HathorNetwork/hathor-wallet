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
    fs: false,
    assert: require.resolve('assert'),
    crypto: require.resolve('crypto-browserify'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    os: require.resolve('os-browserify/browser'),
    buffer: require.resolve('buffer'),
    stream: require.resolve('stream-browserify'),
    vm: require.resolve('vm-browserify'),
    path: require.resolve("path-browserify"),
    worker_threads: false,
    perf_hooks: false,
    tls: false,
    net: false
  };

  // Configure module resolution
  config.resolve = {
    ...config.resolve,
    mainFields: ['browser', 'module', 'main'],
    conditionNames: ['import', 'require', 'node', 'default'],
    extensionAlias: {
      '.js': ['.js', '.ts', '.tsx']
    },
    alias: {
      'classic-level': false,
      'level': false,
      'pino-worker': false,
      'pino/file': false,
      'pino-pretty': false
    }
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

  // Add a rule to handle classic-level and pino
  config.module.rules.push({
    test: /[\\/](classic-level|pino)[\\/]/,
    use: 'null-loader'
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
