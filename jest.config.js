/* eslint-disable no-undef */
module.exports = {
  transform: {
    // Dependencies do not inherit .babelrc; explicitly convert their ESM to CommonJS.
    '^.+\\.jsx?$': ['babel-jest', { presets: ['@babel/preset-env'] }],
  },
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/index.js',
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 60,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapper: {
    '\\.(css|less)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)$': '<rootDir>/__mocks__/fileMock.js',
  },
  // Faker v10 ships ESM, so Babel must transform it for Jest's CommonJS runtime.
  transformIgnorePatterns: ['/node_modules/(?!react-leaflet|@react-leaflet|leaflet|@faker-js/faker)'],
};
