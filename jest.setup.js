// jest.setup.js
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock environment variables
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test-key'
process.env.CLERK_SECRET_KEY = 'test-secret'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.REDIS_URL = 'redis://localhost:6379'

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  waitForNextTick: () => new Promise(resolve => setTimeout(resolve, 0)),

  // Helper to create mock functions with implementation
  createMockFn: (implementation) => jest.fn(implementation),

  // Helper to mock API responses
  mockApiResponse: (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  }),

  // Helper to mock fetch
  mockFetch: (response) => {
    global.fetch = jest.fn(() => Promise.resolve(response))
  },

  // Helper to restore fetch
  restoreFetch: () => {
    global.fetch = require('node-fetch')
  }
}

// Mock console methods to reduce noise in tests
const originalConsole = { ...console }
beforeAll(() => {
  console.log = jest.fn()
  console.warn = jest.fn()
  console.error = jest.fn()
})

afterAll(() => {
  Object.assign(console, originalConsole)
})