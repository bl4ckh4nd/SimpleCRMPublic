const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
  collectCoverage: false,
  coverageProvider: 'v8',
  coverageDirectory: path.join(__dirname, 'coverage'),
  collectCoverageFrom: [
    'src/lib/contact-utils.ts',
    'src/lib/grouping.ts',
    'src/services/data/followUpService.ts',
    'src/components/empty-state.tsx',
    'src/components/error-boundary.tsx',
    'src/components/page-header.tsx',
    'shared/ipc/channels.ts',
    'shared/ipc/schemas.ts',
    'shared/ipc/utils.ts',
    'electron/ipc/router.ts',
    'electron/ipc/register.ts',
    'electron/ipc/followup.ts',
    'electron/utils/ports.ts',
    '!**/*.d.ts',
    '!electron/main.js',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/dist-electron/',
    '/coverage/',
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/src', '<rootDir>/shared', '<rootDir>/tests'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@shared/(.*)$': '<rootDir>/shared/$1',
      },
      testMatch: ['<rootDir>/tests/unit/**/*.test.(ts|tsx)'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
      globals: {
        'ts-jest': {
          tsconfig: '<rootDir>/tsconfig.json',
          isolatedModules: true,
        },
      },
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/src', '<rootDir>/shared', '<rootDir>/electron', '<rootDir>/tests'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@shared/(.*)$': '<rootDir>/shared/$1',
      },
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
      globals: {
        'ts-jest': {
          tsconfig: '<rootDir>/tsconfig.electron.json',
          isolatedModules: true,
        },
      },
    },
  ],
};
