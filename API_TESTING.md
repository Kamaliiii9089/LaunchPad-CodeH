/**
 * API Testing Examples
 * 
 * Use these examples to test the BreachBuddy authentication API
 * You can use curl, Postman, or any HTTP client
 */

// ============================================
// 1. SIGNUP - Create a new user account
// ============================================
/**
 * POST /api/auth/signup
 * Creates a new user and returns JWT token
 * 
 * curl command:
 */
// curl -X POST http://localhost:3000/api/auth/signup \
//   -H "Content-Type: application/json" \
//   -d '{
//     "name": "John Doe",
//     "email": "john@example.com",
//     "password": "password123"
//   }'

/**
 * Success Response (201):
 * {
 *   "success": true,
 *   "data": {
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     "user": {
 *       "id": "507f1f77bcf86cd799439011",
 *       "name": "John Doe",
 *       "email": "john@example.com"
 *     }
 *   }
 * }
 */

/**
 * Error Responses:
 * - 400: Missing fields - "Please provide all required fields"
 * - 400: Short password - "Password must be at least 6 characters"
 * - 409: Email exists - "Email already registered"
 * - 500: Server error - "Internal server error"
 */

// ============================================
// 2. LOGIN - Authenticate an existing user
// ============================================
/**
 * POST /api/auth/login
 * Authenticates user and returns JWT token
 * 
 * curl command:
 */
// curl -X POST http://localhost:3000/api/auth/login \
//   -H "Content-Type: application/json" \
//   -d '{
//     "email": "john@example.com",
//     "password": "password123"
//   }'

/**
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     "user": {
 *       "id": "507f1f77bcf86cd799439011",
 *       "name": "John Doe",
 *       "email": "john@example.com"
 *     }
 *   }
 * }
 */

/**
 * Error Responses:
 * - 400: Missing fields - "Please provide email and password"
 * - 401: Invalid creds - "Invalid credentials"
 * - 500: Server error - "Internal server error"
 */

// ============================================
// 3. VERIFY - Check if token is valid
// ============================================
/**
 * GET /api/auth/verify
 * Verifies the JWT token is valid
 * 
 * curl command:
 */
// curl -X GET http://localhost:3000/api/auth/verify \
//   -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

/**
 * Success Response (200):
 * {
 *   "success": true,
 *   "user": {
 *     "id": "507f1f77bcf86cd799439011",
 *     "email": "john@example.com"
 *   }
 * }
 */

/**
 * Error Responses:
 * - 401: No token - "No token provided"
 * - 401: Invalid token - "Invalid token"
 * - 500: Server error - "Verification failed"
 */

// ============================================
// FRONTEND INTEGRATION EXAMPLES
// ============================================

/**
 * Example 1: Using the useAuth hook in a component
 */
const ExampleComponent = () => {
  const { signup, login, logout, loading, error } = useAuth();

  const handleSignup = async () => {
    const success = await signup(
      'John Doe',
      'john@example.com',
      'password123'
    );
    if (success) {
      console.log('Signup successful!');
      // User is redirected to /dashboard automatically
    }
  };

  const handleLogin = async () => {
    const success = await login('john@example.com', 'password123');
    if (success) {
      console.log('Login successful!');
      // User is redirected to /dashboard automatically
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <button onClick={handleSignup} disabled={loading}>
        Sign Up
      </button>
      <button onClick={handleLogin} disabled={loading}>
        Login
      </button>
    </div>
  );
};

/**
 * Example 2: Direct API call
 */
const directSignup = async () => {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
    }),
  });

  const data = await response.json();
  if (data.success) {
    // Store token
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));
  } else {
    console.error(data.message);
  }
};

/**
 * Example 3: Using token in requests
 */
const callProtectedEndpoint = async (token: string) => {
  const response = await fetch('/api/auth/verify', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (data.success) {
    console.log('User verified:', data.user);
  }
};

// ============================================
// TEST SCENARIOS
// ============================================

/**
 * Test Case 1: Complete signup and login flow
 * 1. Sign up with new email
 * 2. Save returned token
 * 3. Use token to verify user
 * 4. Login with same credentials
 * 5. Verify new token works
 */

/**
 * Test Case 2: Error handling
 * 1. Try signup with existing email (expect 409)
 * 2. Try login with wrong password (expect 401)
 * 3. Try signup with short password (expect 400)
 * 4. Try signup without email (expect 400)
 */

/**
 * Test Case 3: Protected routes
 * 1. Try accessing /dashboard without token (redirects to /login)
 * 2. Login and get token
 * 3. Add token to localStorage
 * 4. Access /dashboard (should work)
 * 5. Clear localStorage
 * 6. Refresh page (should redirect to /login)
 */

export {};
