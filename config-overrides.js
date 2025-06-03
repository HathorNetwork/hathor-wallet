/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const webpack = require('webpack');
const LavaMoatPlugin = require('@lavamoat/webpack')
const path = require('path');
const stdLibBrowser = require('node-stdlib-browser');
const { StatsWriterPlugin } = require('webpack-stats-plugin');

module.exports = function override(config, env) {
  // Enable source maps for better debugging
  config.devtool = env === 'development' ? 'eval-source-map' : 'source-map';

  // Fix source map paths
  config.output = {
    ...config.output,
    devtoolModuleFilenameTemplate: env === 'development'
      ? 'webpack:///./../[resource-path]'
      : info => path.relative('src', info.absoluteResourcePath)
  };

  config.optimization = {
    ...config.optimization,
    minimize: env === 'production',
    concatenateModules: env === 'production'
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
      events: stdLibBrowser.events,
      util: stdLibBrowser.util,
      zlib: stdLibBrowser.zlib,
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

  // Ignore specific webpack warnings that don't affect functionality
  config.ignoreWarnings = [
    // Ignore source map warnings from WalletConnect dependencies
    // These warnings occur because WalletConnect distributes compiled JavaScript files
    // with references to TypeScript source maps that aren't included in the npm package.
    // This is a common issue with TypeScript libraries and doesn't affect functionality.
    // The warnings are purely development-time noise and can be safely ignored.
    /Failed to parse source map/,

    // Ignore color-adjust deprecation warning
    // Bootstrap 4.x uses the 'color-adjust' CSS property which is now deprecated
    // in favor of 'print-color-adjust'. This warning doesn't affect functionality
    // and will be fixed when we update Bootstrap to a newer version.
    /autoprefixer: Replace color-adjust to print-color-adjust/
  ];

  // Update PostCSS options to handle the color-adjust deprecation warning
  // Bootstrap 4.x uses the 'color-adjust' property in its CSS, which is now deprecated
  // in favor of 'print-color-adjust' in newer browser versions
  const cssRules = config.module.rules.find(rule => rule.oneOf).oneOf;
  const cssLoaders = cssRules.filter(rule =>
    rule.use && Array.isArray(rule.use) &&
    rule.use.find(loader => loader.loader && loader.loader.includes('postcss-loader'))
  );

  cssLoaders.forEach(rule => {
    const postcssLoader = rule.use.find(loader => loader.loader && loader.loader.includes('postcss-loader'));
    if (postcssLoader && postcssLoader.options && postcssLoader.options.postcssOptions) {
      postcssLoader.options.postcssOptions.plugins = [
        require('postcss-flexbugs-fixes'),
        [
          require('postcss-preset-env'),
          {
            autoprefixer: {
              // These browser targets ensure we're generating CSS compatible with
              // recent browsers while avoiding generating code for obsolete ones
              overrideBrowserslist: ['last 2 versions', 'not dead']
            },
            stage: 3
          }
        ],
        ...(postcssLoader.options.postcssOptions.plugins || [])
      ];
    }
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
      new StatsWriterPlugin({
        filename: 'stats.json',
        fields: ['modules', 'chunks'],
        stats: {
          modules: true,
          moduleTrace: true,
          source: false, // Reduce file size
        },
      }),
      ...basePlugins,
      new LavaMoatPlugin({
        generatePolicy: true,
        HtmlWebpackPluginInterop: true,
        readableResourceIds: true,
        diagnosticsVerbosity: 3,
        lockdown: {
          consoleTaming: 'unsafe',
          errorTrapping: 'none',
          unhandledRejectionTrapping: 'none',
          overrideTaming: 'severe',
        }
      }),
    ];
  } else {
    config.plugins = basePlugins;
  }

  return config;
}
