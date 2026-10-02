/* global require, process, describe, afterEach, jest, test, expect */
describe('development server security configuration', () => {
  const configPath = require.resolve('react-scripts/config/webpackDevServer.config');
  const startPath = require.resolve('react-scripts/scripts/start');
  const originalHost = process.env.HOST;

  afterEach(() => {
    if (originalHost === undefined) delete process.env.HOST;
    else process.env.HOST = originalHost;
    jest.resetModules();
  });

  test('restores publicPath containment and restricts local access', () => {
    jest.mock('react-scripts/scripts/start', () => ({}));
    const original = require(configPath);
    const originalConfig = original(undefined, 'localhost');
    delete process.env.HOST;

    require('./start');

    const config = require(configPath)(undefined, 'localhost');
    expect(config.devMiddleware.publicPath).toBe(`${originalConfig.devMiddleware.publicPath}/`);
    expect(config.allowedHosts).toEqual(['localhost', '127.0.0.1', '[::1]']);
    expect(config.headers).toEqual({ 'Cross-Origin-Resource-Policy': 'same-origin' });
    expect(process.env.HOST).toBe('127.0.0.1');
    expect(require(startPath)).toEqual({});
  });
});
