# Authentication Guide

## Overview

BreachBuddy supports two authentication methods:
1. **Manual Authentication** - Email and password
2. **Google OAuth** - Sign in with Google

Both methods provide secure access to your account and can be used interchangeably.

---

## Table of Contents

1. [Manual Authentication](#manual-authentication)
2. [Google OAuth Authentication](#google-oauth-authentication)
3. [Security Features](#security-features)
4. [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
5. [API Integration](#api-integration)
6. [Troubleshooting](#troubleshooting)

---

## Manual Authentication

### Registration

**Endpoint:** `POST /api/auth/register`

#### Request Format

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Password Requirements

Your password must meet the following criteria:
- **Minimum length:** 8 characters
- **Uppercase letter:** At least one (A-Z)
- **Lowercase letter:** At least one (a-z)
- **Number:** At least one (0-9)

**Examples of Valid Passwords:**
- `SecurePass123`
- `MyEmail2024!`
- `Password1234`
- `Welcome123`

**Examples of Invalid Passwords:**
- `pass123` ❌ (no uppercase)
- `PASSWORD123` ❌ (no lowercase)
- `Password` ❌ (no number)
- `Pass12` ❌ (too short)

#### Response

**Success (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "name": "John Doe"
  },
  "message": "Account created successfully"
}
```

**Error (400 Bad Request):**
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Password must be at least 8 characters long",
      "param": "password",
      "location": "body"
    }
  ]
}
```

**Error (400 Bad Request) - Email exists:**
```json
{
  "message": "Email already registered. Please login instead."
}
```

---

### Login

**Endpoint:** `POST /api/auth/login`

#### Request Format

```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Response

**Success (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

**Success with 2FA (200 OK):**
```json
{
  "requires2FA": true,
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Two-factor authentication required"
}
```

**Error (401 Unauthorized):**
```json
{
  "message": "Invalid credentials"
}
```

---

## Google OAuth Authentication

### Flow Overview

1. Frontend requests OAuth URL from backend
2. User is redirected to Google's consent screen
3. User grants permissions
4. Google redirects back with authorization code
5. Backend exchanges code for tokens
6. User is logged in and redirected to dashboard

### Get OAuth URL

**Endpoint:** `GET /api/auth/google/url`

#### Response

```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

#### Usage (Frontend)

```javascript
// Get OAuth URL
const response = await fetch('/api/auth/google/url');
const { authUrl } = await response.json();

// Redirect user to Google
window.location.href = authUrl;
```

---

### OAuth Callback

**Endpoint:** `GET /api/auth/google/callback`

#### Query Parameters

- `code`: Authorization code from Google (automatically provided)
- `error`: Error code if authorization failed

#### Response

**Success:**
Redirects to: `http://localhost:3000/login/callback?token=<jwt>&user=<encoded_user_data>`

**Error:**
Redirects to: `http://localhost:3000/login?error=<error_message>`

---

### API Callback (Alternative)

**Endpoint:** `POST /api/auth/google/callback`

#### Request Format

```json
{
  "code": "4/0AY0e-g7..."
}
```

#### Response

**Success (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "name": "John Doe",
    "picture": "https://lh3.googleusercontent.com/..."
  }
}
```

---

## Security Features

### Password Hashing

- All passwords are hashed using **bcrypt**
- Salt rounds: **12** (very secure)
- Passwords are **never** stored in plain text
- Password comparison uses constant-time algorithm

### JWT Tokens

- **Algorithm:** HS256 (HMAC with SHA-256)
- **Expiration:** Configurable (default: 7 days)
- **Payload includes:**
  - User ID
  - Issue timestamp
  - Expiration timestamp

### Rate Limiting

#### Registration & Login Endpoints

- **Strict Rate Limit:** 5 requests per 15 minutes
- **Purpose:** Prevent brute force attacks
- **Applies to:**
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/google/callback`

#### Failed Login Tracking

- Tracks failed login attempts by IP address
- Increases delay after multiple failures
- Logs suspicious activity for monitoring

### CSRF Protection

- **Public endpoints** (login, register) are **exempt** from CSRF
- **Authenticated endpoints** require valid CSRF token
- CSRF cookies use:
  - `httpOnly: true`
  - `secure: true` (production)
  - `sameSite: 'strict'`

### Security Logging

All authentication events are logged:
- ✅ Successful logins
- ❌ Failed login attempts
- 🆕 New account registrations
- 🔒 Account deletions
- ⚠️ Suspicious activities

**Logged Information:**
- User ID and email
- IP address
- Timestamp
- Authentication method (email/oauth)
- User agent

---

## Two-Factor Authentication (2FA)

### Enabling 2FA

1. Log in to your account
2. Go to **Settings** → **Security**
3. Click **"Enable Two-Factor Authentication"**
4. Scan the QR code with your authenticator app
5. Enter the 6-digit verification code
6. Save your backup codes

### Login with 2FA

When 2FA is enabled:

1. Enter your email and password (or use Google)
2. Receive a temporary token
3. Enter the 6-digit code from your authenticator app
4. Complete login

**API Flow:**

```javascript
// Step 1: Initial login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

// Response: 2FA required
{
  "requires2FA": true,
  "tempToken": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Two-factor authentication required"
}

// Step 2: Verify 2FA code
POST /api/auth/2fa/validate
{
  "tempToken": "eyJhbGciOiJIUzI1NiIs...",
  "token": "123456"
}

// Response: Full access token
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### Supported Authenticator Apps

- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password
- LastPass Authenticator

---

## API Integration

### Storing the Token

After successful authentication, store the JWT token securely:

#### Frontend (JavaScript)

```javascript
// Store in localStorage
localStorage.setItem('token', token);
localStorage.setItem('user', JSON.stringify(user));

// Or use sessionStorage for session-only storage
sessionStorage.setItem('token', token);
```

### Making Authenticated Requests

Include the token in the Authorization header:

```javascript
// Using Fetch API
fetch('/api/dashboard/overview', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Using Axios
axios.get('/api/dashboard/overview', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Token Expiration Handling

```javascript
// Check if token is expired
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

// Redirect to login if expired
if (isTokenExpired(token)) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}
```

### Automatic Token Refresh

```javascript
// Axios interceptor for 401 responses
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## Troubleshooting

### Common Issues

#### "Invalid credentials" error

**Causes:**
- Incorrect email or password
- Account doesn't exist
- Password case-sensitivity

**Solutions:**
- Verify your email address
- Check caps lock key
- Try password reset (if available)
- Register a new account

---

#### "Email already registered" error

**Causes:**
- Account already exists with that email
- Previous registration

**Solutions:**
- Use the login page instead of signup
- Try "Forgot Password" if available
- Use Google Sign-In with the same email

---

#### "Validation failed" error

**Causes:**
- Password doesn't meet requirements
- Invalid email format
- Missing required fields

**Solutions:**
- Ensure password has 8+ characters, uppercase, lowercase, and number
- Check email format (must contain @ and domain)
- Fill all required fields

---

#### "Rate limit exceeded" error

**Causes:**
- Too many login/registration attempts
- Exceeded 5 requests per 15 minutes

**Solutions:**
- Wait 15 minutes before trying again
- Check for automated scripts making requests
- Contact support if issue persists

---

#### Google OAuth fails

**Causes:**
- Blocked popup window
- Cancelled authorization
- Network issues

**Solutions:**
- Allow popups from the website
- Try again and grant permissions
- Check internet connection
- Clear browser cache

---

#### Token expired / 401 Unauthorized

**Causes:**
- JWT token has expired
- Invalid token
- Token was revoked

**Solutions:**
- Log out and log back in
- Clear browser storage
- Check token expiration time

---

### Getting Help

If you continue to experience issues:

1. **Check the logs:** Look at browser console for error messages
2. **Clear cache:** Clear browser cache and cookies
3. **Try incognito:** Test in private/incognito mode
4. **Contact support:** Reach out with error details

**Support Channels:**
- Email: support@breachbuddy.com
- GitHub Issues: [Project Repository]
- Documentation: [docs.breachbuddy.com]

---

## Best Practices

### For Users

✅ **Do:**
- Use strong, unique passwords
- Enable 2FA for extra security
- Keep your email address up to date
- Log out on shared devices
- Use password managers

❌ **Don't:**
- Share your password with others
- Use the same password across sites
- Log in on public/untrusted networks without VPN
- Save passwords in plain text

### For Developers

✅ **Do:**
- Store tokens securely (localStorage or sessionStorage)
- Always use HTTPS in production
- Implement token refresh logic
- Handle 401 responses appropriately
- Log security events

❌ **Don't:**
- Store tokens in cookies without httpOnly
- Expose tokens in URLs
- Skip input validation
- Ignore rate limiting
- Hard-code credentials

---

## Security Contact

Found a security vulnerability? Please report it responsibly:

- **Email:** security@breachbuddy.com
- **Encrypt with:** [PGP Key]
- **Response time:** Within 24 hours

**Please do not:**
- Post security issues publicly
- Exploit vulnerabilities
- Share with others before disclosure

---

## Changelog

### Version 2.0.0 (January 2026)
- ✨ Added manual email/password authentication
- ✨ Added registration endpoint with password validation
- 🔒 Enhanced security logging for auth events
- 🔒 Improved rate limiting for auth endpoints
- 🔒 Added CSRF exemption for public endpoints
- 📝 Updated documentation

### Version 1.0.0
- 🚀 Initial release
- 🔐 Google OAuth authentication
- 🔐 JWT token management
- 🔐 Two-factor authentication support
