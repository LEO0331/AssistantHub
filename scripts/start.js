/* global require, process */
// CRA 5 removes the trailing slash required by webpack-dev-middleware's
// publicPath containment check. Keep the workaround outside node_modules.
process.env.HOST = process.env.HOST || '127.0.0.1';
const configPath = require.resolve('react-scripts/config/webpackDevServer.config');
const createConfig = require(configPath);

require.cache[configPath].exports = (...args) => {
  const config = createConfig(...args);
  config.devMiddleware.publicPath = `${config.devMiddleware.publicPath.replace(/\/+$/, '')}/`;
  config.allowedHosts = ['localhost', '127.0.0.1', '[::1]'];
  // The app and HMR client use the same origin; cross-origin access is unnecessary.
  config.headers = { 'Cross-Origin-Resource-Policy': 'same-origin' };
  return config;
};

require('react-scripts/scripts/start');
