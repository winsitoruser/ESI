// Jest configuration for Bedagang PoS
// Uses CommonJS format because ts-node is not installed
/** @type {import('jest').Config} */
module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  // Only match *.test.{ts,tsx,js,jsx} — NOT plain test.ts API route files
  testMatch: ['<rootDir>/**/*.test.{ts,tsx,js,jsx}'],

  // Ignore node_modules, .next build output, and export/backend duplicates
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/export/backend/'],
  modulePathIgnorePatterns: ['<rootDir>/export/'],

  // Map @/ path alias to project root (matches tsconfig paths)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Transform .ts/.tsx files with ts-jest using jest-specific tsconfig
  // (tsconfig.jest.json sets jsx: "react-jsx" instead of "preserve")
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Setup file runs before each test suite
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Don't fail when there are no tests yet
  passWithNoTests: true,

  // Coverage configuration
  collectCoverageFrom: [
    '<rootDir>/**/*.{ts,tsx}',
    '!<rootDir>/**/*.d.ts',
    '!<rootDir>/node_modules/**',
    '!<rootDir>/.next/**',
    '!<rootDir>/export/**',
    '!<rootDir>/migrations/**',
    '!<rootDir>/seeders/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
};
