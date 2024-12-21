const webpack = require('webpack');
const LavaMoatPlugin = require('@lavamoat/webpack')
const fs = require('fs');
const path = require('path');

module.exports = function override(config, env) {
  // Enable source maps for better debugging
  config.devtool = 'source-map';

  config.optimization = {
    ...config.optimization,
    minimize: false,
    concatenateModules: false
  };

  // Configure module resolution
  config.resolve = {
    ...config.resolve,
    fallback: {
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
    },
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
      'pino-pretty': false,
      'axios': path.resolve(__dirname, 'node_modules/axios'),
      // Add an alias for our buffer shim
      'buffer-shim': path.resolve(__dirname, 'src/buffer-shim.js')
    }
  };

  // Add a rule to handle axios imports
  config.module.rules.push({
    test: /[\\/]axios[\\/]/,
    resolve: {
      alias: {
        'axios': path.resolve(__dirname, 'node_modules/axios')
      }
    }
  });

  config.module.rules.push({
    test: /\.m?js/,
    resolve: {
      fullySpecified: false
    }
  });

  // Use null-loader for Node.js-specific packages
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
    ...config.plugins.filter(p => !(p instanceof webpack.ProvidePlugin)),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer-shim', 'default']
    }),
  ];

  return config;
}
