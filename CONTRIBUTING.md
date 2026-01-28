# Contributing to BreachBuddy

First off, thank you for considering contributing to BreachBuddy! It's people like you that make BreachBuddy such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

**Bug Report Template:**

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. Windows 11, macOS 13]
 - Browser [e.g. chrome, safari]
 - Version [e.g. 22]
 - Node Version [e.g. 18.0.0]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Create an issue and provide the following information:

**Enhancement Suggestion Template:**

```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

### Pull Requests

1. **Fork the repo** and create your branch from `main`.
2. **Make your changes** following our coding standards.
3. **Test your changes** thoroughly.
4. **Update documentation** if needed.
5. **Write clear commit messages**.
6. **Submit a pull request**.

## Development Setup

1. Clone your fork:
```bash
git clone https://github.com/your-username/LaunchPad-CodeH.git
cd LaunchPad-CodeH
```

2. Install dependencies:
```bash
npm install
cd backend && npm install
```

3. Create a branch:
```bash
git checkout -b feature/my-new-feature
```

4. Make your changes and test them

5. Commit your changes:
```bash
git add .
git commit -m "feat: add amazing new feature"
```

6. Push to your fork:
```bash
git push origin feature/my-new-feature
```

## Coding Standards

### JavaScript/React

- Use ES6+ features
- Use functional components with hooks
- Follow React best practices
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Keep functions small and focused (< 50 lines)
- Use destructuring when appropriate

**Example:**

```javascript
/**
 * Fetches user subscriptions from the API
 * @param {string} userId - The user's unique identifier
 * @returns {Promise<Array>} Array of subscription objects
 */
const fetchSubscriptions = async (userId) => {
  try {
    const response = await subscriptionAPI.getSubscriptions(userId);
    return response.data.subscriptions;
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    throw error;
  }
};
```

### CSS

- Use CSS variables for colors and spacing
- Follow BEM naming convention when appropriate
- Keep selectors specific but not overly nested
- Use flexbox/grid for layouts
- Mobile-first responsive design

### Git Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation only changes
- `style:` - Changes that don't affect code meaning (formatting, etc.)
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Changes to build process or auxiliary tools

**Examples:**
```bash
feat: add email export functionality
fix: resolve sidebar navigation bug on mobile
docs: update API endpoint documentation
refactor: simplify subscription filtering logic
```

## Testing Guidelines

### Frontend Tests
```bash
npm test
```

- Write tests for all new components
- Test edge cases and error handling
- Aim for >80% code coverage
- Use React Testing Library

### Backend Tests
```bash
cd backend
npm test
```

- Test all API endpoints
- Test authentication and authorization
- Test database operations
- Mock external API calls

## Documentation

- Update README.md if you change functionality
- Add JSDoc comments to functions
- Update API documentation for endpoint changes
- Include screenshots for UI changes

## Review Process

1. **Automated Checks**: Your PR will run automated tests and linting
2. **Code Review**: A maintainer will review your code
3. **Changes Requested**: Make any requested changes
4. **Approval**: Once approved, your PR will be merged

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

## Recognition

Contributors will be added to the README.md file!

Thank you for contributing! 🎉
