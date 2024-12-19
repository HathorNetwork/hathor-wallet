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

  // Node.js built-in modules and their browser fallbacks/polyfills
  // Some modules are set to 'false' because they are:
  // 1. Node.js specific and don't work in browsers (like 'fs' and 'worker_threads')
  // 2. Only used in the Electron main process, not in the renderer
  // 3. Have browser alternatives (e.g., IndexedDB instead of 'fs')
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
    // Prevent bundling of certain Node.js-specific modules in renderer process
    // - classic-level/level: Node.js database packages that require filesystem access
    // - pino and related: Node.js logging library that uses worker_threads and filesystem
    // These modules are likely used only in the Electron main process
    // and their functionality should be:
    // 1. Executed in main process and communicated via IPC, or
    // 2. Replaced with browser-compatible alternatives
    alias: {
      'classic-level': false,
      'level': false,
      'pino-worker': false,
      'pino/file': false,
      'pino-pretty': false,
      // Force all axios imports to use the same version
      'axios': path.resolve(__dirname, 'node_modules/axios')
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

  // Use null-loader for Node.js-specific packages that shouldn't be bundled
  // in the renderer process. These packages are either:
  // 1. Used only in the main process
  // 2. Need to be replaced with browser-compatible alternatives
  // 3. Their functionality should be accessed via IPC
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
