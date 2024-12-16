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
    path: require.resolve('path-browserify'),
    vm: require.resolve('vm-browserify'),
  };

  // Read the generated policy file
  let policy = {};
  const policyPath = path.join(__dirname, 'lavamoat', 'webpack');
  const policyFile = path.join(policyPath, 'policy.json');
  
  try {
    policy = JSON.parse(fs.readFileSync(policyFile, 'utf8'));
  } catch (err) {
    console.warn('No existing LavaMoat policy found, will generate one');
  }

  // Add custom policies
  /* if (policy.resources) {
    // WalletConnect policy
    if (!policy.resources['@walletconnect/core']) {
      policy.resources['@walletconnect/core'] = {
        globals: {
          ArrayBuffer: true,
          Uint8Array: true,
          Object: true,
          'Object.prototype': true,
          'Object.getPrototypeOf': true,
          Symbol: true,
          'Function.prototype': true
        }
      };
    }

    // React policy
    if (!policy.resources['react']) {
      policy.resources['react'] = {
        globals: {
          Object: true,
          'Object.prototype': true,
          'Function.prototype': true
        }
      };
    }

    // Lodash policy
    if (!policy.resources['lodash']) {
      policy.resources['lodash'] = {
        globals: {
          Object: true,
          'Object.prototype': true,
          'Function.prototype': true
        }
      };
    }
  }*/

  // Don't use LavaMoat when running in electron
  if (process.env.ELECTRON_RUN === 'true') {
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
  } else {
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
      }),
      new webpack.DefinePlugin({
        'process.env': JSON.stringify(process.env),
      }),
    ];
  }

  config.module.rules.push({
    test: /\.m?js/,
    resolve: {
      fullySpecified: false
    }
  });

  return config;
}
