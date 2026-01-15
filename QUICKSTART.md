# Quick Start Guide for Contributors

Welcome! This guide will get you contributing to LaunchPad-CodeH in minutes.

## Prerequisites
- Node.js v16+ and npm v7+
- MongoDB (local or cloud)
- Git

## Setup (5 minutes)

### 1. Clone and Install
```zsh
git clone https://github.com/PankajSingh34/LaunchPad-CodeH.git
cd LaunchPad-CodeH
npm run setup
```

### 2. Configure Backend
Create `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/gmail-subscription-manager
JWT_SECRET=your-secret-key-change-this
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
SKIP_RATE_LIMIT_DEV=true
```

### 3. Start Development
```zsh
# Terminal 1: Start both frontend and backend
npm run dev:both

# OR start separately:
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run dev:backend
```

### 4. Verify
- Frontend: http://localhost:5173
- Backend: http://localhost:5000/health

## Making Changes

### Create a Branch
```zsh
git checkout -b feature/your-feature-name
```

### Write Tests
**Frontend** (`src/__tests__/YourComponent.test.jsx`):
```jsx
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import YourComponent from '../components/YourComponent';

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText(/expected text/i)).toBeInTheDocument();
  });
});
```

**Backend** (`backend/tests/yourFeature.test.js`):
```javascript
const request = require('supertest');
const app = require('../server');

describe('Your Feature', () => {
  it('works correctly', async () => {
    const res = await request(app).get('/api/your-endpoint');
    expect(res.status).toBe(200);
  });
});
```

### Run Tests
```zsh
# Frontend
npm test

# Backend
cd backend && npm test
```

### Commit Your Changes
```zsh
git add .
git commit -m "feat: add awesome feature"
```

### Push and Create PR
```zsh
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Common Tasks

### Add a New Component
```zsh
# 1. Create component
touch src/components/MyComponent.jsx
touch src/components/MyComponent.css

# 2. Create test
touch src/__tests__/MyComponent.test.jsx

# 3. Run tests
npm test -- MyComponent.test.jsx
```

### Add a New API Endpoint
```zsh
# 1. Add route handler
# Edit: backend/routes/yourRoute.js

# 2. Add controller
# Edit: backend/controllers/yourController.js

# 3. Add test
touch backend/tests/yourController.test.js

# 4. Run tests
cd backend && npm test
```

### Fix Accessibility Issues
```jsx
// Bad
<button onClick={handleClick}>
  <img src="icon.png" />
</button>

// Good
<button 
  onClick={handleClick}
  aria-label="Descriptive action"
>
  <img src="icon.png" alt="" />
</button>
```

## Troubleshooting

### Tests Failing?
```zsh
# Clear cache
rm -rf node_modules .vite
npm install

# Backend: Ensure MongoDB is running
mongod --version
```

### Port Already in Use?
```zsh
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Environment Variables Not Loading?
```zsh
# Check .env file exists
ls backend/.env

# Restart backend
npm run dev:backend
```

## Key Files to Know

### Frontend
- `src/components/`: React components
- `src/pages/`: Page components
- `src/__tests__/`: Component tests
- `src/utils/api.js`: API client
- `vite.config.js`: Build config

### Backend
- `backend/routes/`: API routes
- `backend/controllers/`: Business logic
- `backend/middleware/`: Express middleware
- `backend/tests/`: Backend tests
- `backend/server.js`: Main entry point

## Testing Checklist

Before submitting a PR:
- [ ] All tests pass (`npm test` and `cd backend && npm test`)
- [ ] No console errors
- [ ] Accessibility features work (keyboard navigation, screen readers)
- [ ] Code follows existing style
- [ ] Documentation updated if needed

## Getting Help

- Check `docs/TESTING.md` for test examples
- Check `CONTRIBUTING.md` for detailed guidelines
- Open an issue for questions
- Review existing code for patterns

## Quick Wins (Good First Issues)

1. **Add more tests**: Pick any component without tests
2. **Improve accessibility**: Add ARIA labels to buttons
3. **Fix typos**: Check docs and comments
4. **Add error messages**: Make errors more user-friendly
5. **Optimize performance**: Add React.memo where appropriate

---

Happy coding! 🚀
