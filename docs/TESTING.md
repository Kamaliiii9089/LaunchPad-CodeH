# Test Suite Documentation

This directory contains automated tests for the LaunchPad-CodeH project.

## Test Structure

```
backend/tests/
├── auth.test.js              # Authentication middleware tests
├── health.test.js            # Health endpoint tests
├── rateLimiter.test.js       # Rate limiting behavior tests
└── userController.test.js    # User controller tests

src/__tests__/
├── DashboardLayout.test.jsx  # Dashboard layout component tests
├── Navbar.test.jsx           # Navigation bar tests
└── Sidebar.test.jsx          # Sidebar component tests
```

## Running Tests

### Frontend Tests (Vitest)

```zsh
# Run all frontend tests
npm test

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- Navbar.test.jsx
```

### Backend Tests (Jest)

```zsh
# Navigate to backend
cd backend

# Run all backend tests
npm test

# Run specific test suite
npm test -- auth.test.js

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Health Endpoint Tests

```zsh
cd backend

# Start the server first
npm run dev

# In another terminal, run health checks
npm run test:health
```

### Rate Limiter Tests

```zsh
cd backend
npm run test:rate-limit
```

## Writing Tests

### Frontend Component Tests

Use React Testing Library with Vitest:

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyComponent from '../components/MyComponent';

// Mock context if needed
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Test User', email: 'test@example.com' },
    logout: vi.fn()
  })
}));

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(
      <MemoryRouter>
        <MyComponent />
      </MemoryRouter>
    );
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles user interaction', () => {
    render(
      <MemoryRouter>
        <MyComponent />
      </MemoryRouter>
    );
    
    const button = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(button);
    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });
});
```

### Backend API Tests

Use Jest with Supertest:

```javascript
const request = require('supertest');
const express = require('express');
const myRouter = require('../routes/myRouter');

describe('API Route Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', myRouter);
  });

  it('GET /api/resource returns 200', async () => {
    const res = await request(app)
      .get('/api/resource')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/resource validates input', async () => {
    const res = await request(app)
      .post('/api/resource')
      .send({ invalid: 'data' });

    expect(res.status).toBe(400);
  });
});
```

## Test Coverage Goals

- **Frontend**: >80% coverage for components
- **Backend**: >80% coverage for controllers and services
- **Critical paths**: 100% coverage (auth, payments, data mutations)

## Continuous Integration

Tests run automatically on:
- Every push to feature branches
- Pull request creation
- Before merging to main

## Debugging Tests

### Frontend
```zsh
# Add debug output
npm test -- --reporter=verbose

# Run single test with logging
npm test -- --run Navbar.test.jsx
```

### Backend
```zsh
# Run with Node inspector
node --inspect-brk node_modules/.bin/jest auth.test.js

# Increase timeout for slow tests
npm test -- --testTimeout=10000
```

## Common Issues

### Frontend Tests Failing
- Check that mocks are properly set up
- Ensure MemoryRouter wraps components using routing
- Verify async operations are properly awaited

### Backend Tests Failing
- Ensure MongoDB is running (or mocked)
- Check environment variables are set
- Verify test database is clean between tests

### Rate Limiter Tests
- May need to clear rate limit store between tests
- Consider using separate rate limit instances for tests

## Best Practices

1. **Isolation**: Each test should be independent
2. **Descriptive names**: Use clear, descriptive test names
3. **AAA Pattern**: Arrange, Act, Assert
4. **Mock external dependencies**: Don't call real APIs in tests
5. **Clean up**: Reset state after each test
6. **Fast tests**: Keep unit tests under 100ms

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
