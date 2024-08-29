/* eslint-disable no-undef */
module.exports = {
    transform: {
      "^.+\\.jsx?$": "babel-jest",
    },
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
      '\\.(css|less)$': 'identity-obj-proxy', // Mock CSS imports
      '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)$': '<rootDir>/__mocks__/fileMock.js', // Mock image and font imports
    },
    transformIgnorePatterns: [
      "/node_modules/(?!react-leaflet|@react-leaflet|leaflet)" // Ignore transformation of node_modules except leaflet-related modules
    ],
  };
  