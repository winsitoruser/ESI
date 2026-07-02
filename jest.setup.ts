// Jest setup file - runs before each test suite
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/router', () => require('next-router-mock'));

// Global test timeout
jest.setTimeout(10000);

// Suppress console warnings in tests (optional - uncomment if needed)
// const originalWarn = console.warn;
// console.warn = (...args) => {
//   if (typeof args[0] === 'string' && args[0].includes('deprecated')) return;
//   originalWarn(...args);
// };
