// Jest setup file for backend tests
const path = require('path');

// Load test environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Uncomment to ignore specific log levels
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(10000);

// Setup test environment
beforeAll(async () => {
  // Any global setup
});

afterAll(async () => {
  // Any global cleanup
});