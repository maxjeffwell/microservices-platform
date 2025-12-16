export default {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'models/**/*.js',
    'routes/**/*.js',
    'config/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  transform: {},
  moduleNameMapper: {
    '^@platform/(.*)$': '<rootDir>/../../shared/$1'
  },
  testTimeout: 10000
};
