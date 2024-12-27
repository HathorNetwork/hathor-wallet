const webpack = require('webpack');
const LavaMoatPlugin = require('@lavamoat/webpack')
const fs = require('fs');
const path = require('path');
const stdLibBrowser = require('node-stdlib-browser');

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
      buffer: require.resolve('buffer/'),
      assert: stdLibBrowser.assert,
      crypto: stdLibBrowser.crypto,
      path: stdLibBrowser.path,
      process: stdLibBrowser.process,
      stream: stdLibBrowser.stream,
      os: stdLibBrowser.os,
      vm: false,
    },
    mainFields: ['browser', 'module', 'main'],
    conditionNames: ['import', 'require', 'node', 'default'],
    extensionAlias: {
      '.js': ['.js', '.ts', '.tsx']
    },
    alias: {
      'classic-level': false,
      'level': false,
      'axios': path.resolve(__dirname, 'node_modules/axios'),
      'buffer-shim': path.resolve(__dirname, 'src/buffer-shim.js'),
      'pino': require.resolve('pino/browser.js')
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

  // Allow importing of .mjs files without specifying the extension
  // This is needed because Node.js requires the .mjs extension for ES modules,
  // but webpack can handle them automatically
  config.module.rules.push({
    test: /\.m?js/,
    resolve: {
      fullySpecified: false
    }
  });

  // Use null-loader for Node.js-specific packages
  config.module.rules.push({
    test: /[\\/](classic-level)[\\/]/,
    use: 'null-loader'
  });

  // Base plugins that we always want
  const basePlugins = [
    ...config.plugins.filter(p => !(p instanceof webpack.ProvidePlugin)),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: stdLibBrowser.process
    })
  ];

  // Only add LavaMoat in production because LavaMoat does not work with the
  // hot reloading feature in dev.
  if (env === 'production') {
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
      ...basePlugins
    ];
  } else {
    config.plugins = basePlugins;
  }

  return config;
}
