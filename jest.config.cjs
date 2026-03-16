const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
  collectCoverage: false,
  coverageProvider: 'v8',
  coverageDirectory: path.join(__dirname, 'coverage'),
  collectCoverageFrom: [
    // Existing covered files
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
    // New IPC handler coverage (all ≥90%)
    'electron/ipc/dashboard.ts',
    'electron/ipc/mssql.ts',
    'electron/ipc/sync.ts',
    'electron/ipc/jtl.ts',
    'electron/ipc/window.ts',
    'electron/ipc/update.ts',
    // New frontend coverage (all ≥90%)
    'src/lib/api-error-handler.ts',
    'src/components/main-nav.tsx',
    'src/components/deal/kanban-card.tsx',
    'src/components/deal/kanban-column.tsx',
    'src/components/followup/instant-detail-panel.tsx',
    'src/components/followup/quick-actions.tsx',
    'src/components/followup/smart-queue-rail.tsx',
    // New IPC handlers (all ≥90%)
    'electron/ipc/tasks.ts',
    'electron/ipc/calendar.ts',
    'electron/ipc/custom-fields.ts',
    'electron/ipc/database.ts',
    // New utilities (all ≥90%)
    'shared/errors/mssql.ts',
    'src/types/deal.ts',
    'src/lib/utils.ts',
    'src/lib/electron-utils.ts',
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
      transform: {
        // Use a custom transformer for files that contain import.meta.env (Vite-specific syntax)
        'localDataService\\.ts$': '<rootDir>/tests/setup/transform-import-meta.cjs',
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', isolatedModules: true }],
      },
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
