/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/index.ts', // Exclude index file if it's just exports
    '!src/types.ts'  // Exclude type definitions
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 65,
      functions: 90,
      lines: 90
    },
    './src/functions.ts': {
      statements: 93,
      branches: 65,
      functions: 100,
      lines: 96
    }
  },
  coverageReporters: ['text', 'html', 'json-summary', 'json'],
  coverageDirectory: 'coverage'
};