# API Documentation

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register User (Email/Password)

Create a new user account using email and password.

**Endpoint:** `POST /auth/register`

**Authentication:** Not required (public endpoint)

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Validation Rules:**
- `name`: Required, non-empty string
- `email`: Required, valid email format
- `password`: Required, minimum 8 characters, must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number

**Response:** `201 Created`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "name": "John Doe"
  },
  "message": "Account created successfully"
}
```

**Error Responses:**

`400 Bad Request` - Validation failed
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

`400 Bad Request` - Email already registered
```json
{
  "message": "Email already registered. Please login instead."
}
```

---

### Login (Email/Password)

Authenticate a user with email and password.

**Endpoint:** `POST /auth/login`

**Authentication:** Not required (public endpoint)

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

**Response (2FA Enabled):** `200 OK`
```json
{
  "requires2FA": true,
  "tempToken": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Two-factor authentication required"
}
```

**Error Responses:**

`400 Bad Request` - Validation failed
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Please provide a valid email",
      "param": "email",
      "location": "body"
    }
  ]
}
```

`401 Unauthorized` - Invalid credentials
```json
{
  "message": "Invalid credentials"
}
```

---

### Get Google OAuth URL

Get the Google OAuth authorization URL.

**Endpoint:** `GET /auth/google/url`

**Authentication:** Not required (public endpoint)

**Response:** `200 OK`
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

**Usage:**
Redirect the user to the returned `authUrl` to initiate Google OAuth flow.

---

### Google OAuth Callback (GET)

Handle Google OAuth callback (browser redirect).

**Endpoint:** `GET /auth/google/callback`

**Authentication:** Not required (public endpoint)

**Query Parameters:**
- `code`: Authorization code from Google (provided by Google)
- `error`: Error code if authorization failed

**Response:**
Redirects to frontend with token in URL:
```
http://localhost:3000/login/callback?token=<jwt_token>&user=<encoded_user_data>
```

**Error Response:**
Redirects to login page with error:
```
http://localhost:3000/login?error=<error_message>
```

---

### Google OAuth Callback (POST)

Handle Google OAuth callback via API.

**Endpoint:** `POST /auth/google/callback`

**Authentication:** Not required (public endpoint)

**Request Body:**
```json
{
  "code": "4/0AY0e-g7..."
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "name": "John Doe",
    "picture": "https://lh3.googleusercontent.com/..."
  }
}
```

**Response (2FA Enabled):** `200 OK`
```json
{
  "requires2FA": true,
  "tempToken": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Two-factor authentication required"
}
```

---

### Register User

Create a new user account.

**Endpoint:** `POST /auth/signup`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### Login

Authenticate a user and receive a JWT token.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### Google OAuth

Initiate Google OAuth flow.

**Endpoint:** `GET /auth/google`

Redirects to Google OAuth consent screen.

### Google OAuth Callback

Handle Google OAuth callback.

**Endpoint:** `GET /auth/google/callback`

**Query Parameters:**
- `code`: Authorization code from Google

Redirects to frontend with token.

### Get User Profile

Get current user's profile.

**Endpoint:** `GET /auth/profile`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## Two-Factor Authentication (2FA) Endpoints

### Setup 2FA

Generate a 2FA secret and QR code for the authenticated user.

**Endpoint:** `POST /auth/2fa/setup`

**Authentication:** Required

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "otpauth_url": "otpauth://totp/LaunchPad%20(user@example.com)?secret=JBSWY3DPEHPK3PXP&issuer=LaunchPad",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Error Responses:**

`401 Unauthorized` - Not authenticated
```json
{
  "message": "Authentication required"
}
```

`500 Internal Server Error` - Server error
```json
{
  "message": "Error generating QR code"
}
```

**Usage:**
1. Call this endpoint to get QR code
2. Display QR code to user
3. User scans with authenticator app
4. User verifies with code from app (see Verify 2FA endpoint)

---

### Verify 2FA

Verify the TOTP code and enable 2FA for the user.

**Endpoint:** `POST /auth/2fa/verify`

**Authentication:** Required

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "token": "123456"
}
```

**Validation:**
- `token`: Required, 6-digit numeric code from authenticator app

**Response:** `200 OK`
```json
{
  "message": "Two-Factor Authentication enabled successfully",
  "is2FAEnabled": true,
  "recoveryCodes": [
    "A1B2C3D4",
    "E5F6G7H8",
    "I9J0K1L2",
    "M3N4O5P6",
    "Q7R8S9T0",
    "U1V2W3X4",
    "Y5Z6A7B8",
    "C9D0E1F2",
    "G3H4I5J6",
    "K7L8M9N0"
  ]
}
```

**Error Responses:**

`400 Bad Request` - Invalid or missing token
```json
{
  "message": "Token is required"
}
```

```json
{
  "message": "Invalid authentication code"
}
```

```json
{
  "message": "2FA setup not initiated"
}
```

**Important:**
- Recovery codes are only returned once after enabling 2FA
- User must save these codes securely
- Each code can only be used once

---

### Disable 2FA

Disable 2FA for the authenticated user.

**Endpoint:** `POST /auth/2fa/disable`

**Authentication:** Required

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "token": "123456"
}
```

**Validation:**
- `token`: Required, current 6-digit code from authenticator app

**Response:** `200 OK`
```json
{
  "message": "Two-Factor Authentication disabled"
}
```

**Error Responses:**

`400 Bad Request` - 2FA not enabled
```json
{
  "message": "2FA is not enabled"
}
```

```json
{
  "message": "Invalid authentication code"
}
```

**Note:** This removes the 2FA secret and all recovery codes.

---

### Validate 2FA (Login)

Validate 2FA code during login flow.

**Endpoint:** `POST /auth/2fa/validate`

**Authentication:** Not required (uses temporary token)

**Request Body:**
```json
{
  "tempToken": "eyJhbGciOiJIUzI1NiIs...",
  "token": "123456",
  "isRecoveryCode": false
}
```

**Or with recovery code:**
```json
{
  "tempToken": "eyJhbGciOiJIUzI1NiIs...",
  "token": "A1B2C3D4",
  "isRecoveryCode": true
}
```

**Parameters:**
- `tempToken`: Required, temporary token from login response
- `token`: Required, 6-digit authenticator code OR 8-character recovery code
- `isRecoveryCode`: Boolean, set to `true` if using recovery code

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "preferences": {...},
    "is2FAEnabled": true
  }
}
```

**Error Responses:**

`400 Bad Request` - Missing parameters
```json
{
  "message": "Missing token or session"
}
```

```json
{
  "message": "Invalid authentication code"
}
```

```json
{
  "message": "Invalid recovery code"
}
```

```json
{
  "message": "No recovery codes available"
}
```

`401 Unauthorized` - Invalid or expired temp token
```json
{
  "message": "Invalid session scope"
}
```

```json
{
  "message": "Invalid or expired session"
}
```

**Notes:**
- Temp token expires after 5 minutes
- Recovery codes are single-use and removed after successful validation
- Full access token is returned after successful validation

---

### Regenerate Recovery Codes

Generate new recovery codes for the authenticated user.

**Endpoint:** `POST /auth/2fa/regenerate-recovery-codes`

**Authentication:** Required

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "token": "123456"
}
```

**Validation:**
- `token`: Required, current 6-digit code from authenticator app

**Response:** `200 OK`
```json
{
  "message": "Recovery codes regenerated successfully",
  "recoveryCodes": [
    "X1Y2Z3A4",
    "B5C6D7E8",
    "F9G0H1I2",
    "J3K4L5M6",
    "N7O8P9Q0",
    "R1S2T3U4",
    "V5W6X7Y8",
    "Z9A0B1C2",
    "D3E4F5G6",
    "H7I8J9K0"
  ]
}
```

**Error Responses:**

`400 Bad Request` - Missing token or 2FA not enabled
```json
{
  "message": "Authentication code is required"
}
```

```json
{
  "message": "2FA is not enabled"
}
```

```json
{
  "message": "Invalid authentication code"
}
```

**Important:**
- Old recovery codes are invalidated and replaced
- New codes are only shown once
- User must save new codes securely

---

### Get Recovery Codes Status

Get the count of remaining recovery codes.

**Endpoint:** `GET /auth/2fa/recovery-codes-status`

**Authentication:** Required

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "remainingCodes": 7,
  "hasRecoveryCodes": true
}
```

**Error Responses:**

`400 Bad Request` - 2FA not enabled
```json
{
  "message": "2FA is not enabled"
}
```

**Use Case:**
- Display warning when recovery codes are running low
- Prompt user to regenerate codes

---

## Subscription Endpoints

### Get All Subscriptions

Retrieve all subscriptions for the authenticated user.

**Endpoint:** `GET /subscriptions`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `search` (optional): Search term
- `category` (optional): Filter by category (subscription, newsletter, verification, login, billing, other)
- `status` (optional): Filter by status (active, revoked)
- `sortBy` (optional): Sort field (lastEmailReceived, firstDetected, serviceName)
- `sortOrder` (optional): Sort order (asc, desc)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "_id": "subscription_id",
        "serviceName": "GitHub",
        "serviceEmail": "noreply@github.com",
        "domain": "github.com",
        "category": "subscription",
        "status": "active",
        "emailCount": 45,
        "firstDetected": "2024-01-01T00:00:00.000Z",
        "lastEmailReceived": "2024-01-15T10:30:00.000Z",
        "unsubscribeUrl": "https://github.com/unsubscribe"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 95,
      "hasMore": true
    }
  }
}
```

### Get Single Subscription

Get details of a specific subscription.

**Endpoint:** `GET /subscriptions/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "subscription": {
      "_id": "subscription_id",
      "serviceName": "GitHub",
      "serviceEmail": "noreply@github.com",
      "domain": "github.com",
      "category": "subscription",
      "status": "active",
      "emailCount": 45,
      "emails": [
        {
          "subject": "Your weekly summary",
          "receivedDate": "2024-01-15T10:30:00.000Z",
          "snippet": "Here's what happened this week..."
        }
      ]
    }
  }
}
```

### Revoke Subscription

Revoke access for a subscription.

**Endpoint:** `POST /subscriptions/:id/revoke`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Subscription revoked successfully",
  "data": {
    "subscription": {
      "_id": "subscription_id",
      "status": "revoked"
    }
  }
}
```

### Grant Subscription

Grant access for a subscription.

**Endpoint:** `POST /subscriptions/:id/grant`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Subscription granted successfully",
  "data": {
    "subscription": {
      "_id": "subscription_id",
      "status": "active"
    }
  }
}
```

### Delete Subscription

Delete a subscription.

**Endpoint:** `DELETE /subscriptions/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Subscription deleted successfully"
}
```

### Bulk Operations

Perform bulk operations on subscriptions.

**Endpoint:** `POST /subscriptions/bulk`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "action": "revoke",
  "subscriptionIds": ["id1", "id2", "id3"]
}
```

**Actions:** `grant`, `revoke`, `delete`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Bulk operation completed successfully",
  "data": {
    "modified": 3
  }
}
```

### Get Overview

Get subscription statistics overview.

**Endpoint:** `GET /subscriptions/overview`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "overview": {
      "total": 95,
      "active": 72,
      "revoked": 23,
      "uniqueCompanies": 45,
      "categoryBreakdown": {
        "subscription": 30,
        "newsletter": 25,
        "verification": 15,
        "login": 10,
        "billing": 10,
        "other": 5
      }
    }
  }
}
```

---

## Email Management Endpoints

### Scan Emails

Initiate a Gmail inbox scan.

**Endpoint:** `POST /emails/scan`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "maxResults": 500
}
```

**Response:** `202 Accepted`
```json
{
  "success": true,
  "message": "Email scan started",
  "data": {
    "scanId": "scan_id",
    "estimatedTime": "2-5 minutes"
  }
}
```

### Get Scan Progress

Check the progress of an ongoing scan.

**Endpoint:** `GET /emails/progress`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "in_progress",
    "progress": 65,
    "scannedEmails": 325,
    "totalEmails": 500,
    "foundSubscriptions": 45
  }
}
```

---

## Breach Check Endpoints

### Get Breach Status

Get breach status for the authenticated user.

**Endpoint:** `GET /breach-check/status`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "serviceName": "GitHub",
        "email": "user@example.com",
        "isBreached": true,
        "breachCount": 2,
        "breaches": [
          {
            "name": "GitHub 2018",
            "domain": "github.com",
            "breachDate": "2018-03-15",
            "pwnCount": 1000000,
            "description": "In March 2018...",
            "dataClasses": ["Email addresses", "Passwords"]
          }
        ],
        "severity": "high",
        "lastChecked": "2024-01-15T10:00:00.000Z"
      }
    ],
    "lastChecked": "2024-01-15T10:00:00.000Z",
    "securityScore": 6.5
  }
}
```

### Check Email for Breaches

Check a specific email for breaches.

**Endpoint:** `POST /breach-check/check`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "isBreached": true,
    "breachCount": 3,
    "breaches": [
      {
        "name": "Adobe 2013",
        "breachDate": "2013-10-04",
        "pwnCount": 152445165,
        "dataClasses": ["Email addresses", "Password hints", "Passwords", "Usernames"]
      }
    ]
  }
}
```

---

## False Positive Endpoints

The False Positive API allows users to report incorrectly flagged security alerts, improving detection accuracy over time.

> 📚 **Detailed Documentation:** See [FALSE_POSITIVE_API.md](./FALSE_POSITIVE_API.md) for complete API reference with all endpoints and examples.

### Submit False Positive Report

Report an incorrectly flagged security alert.

**Endpoint:** `POST /false-positives`

**Headers:** 
- `Authorization: Bearer <token>`
- `X-CSRF-Token: <csrf-token>`

**Request Body:**
```json
{
  "reportType": "phishing",
  "referenceId": "msg_1a2b3c4d5e6f",
  "originalDetection": {
    "riskScore": 85,
    "riskLevel": "high",
    "indicators": ["suspicious_url", "urgency_keywords"]
  },
  "emailData": {
    "from": {
      "email": "support@company.com",
      "name": "Company Support"
    },
    "subject": "Account Verification Required",
    "snippet": "Dear customer, please verify...",
    "messageId": "msg_1a2b3c4d5e6f"
  },
  "userFeedback": {
    "reason": "legitimate_sender",
    "comment": "This is my company's official IT support",
    "confidence": "certain"
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "False positive report submitted successfully",
  "data": {
    "reportId": "fp_9x8y7z6w5v4u",
    "status": "pending",
    "createdAt": "2026-01-16T10:35:00Z",
    "similarReports": {
      "count": 2
    }
  }
}
```

### Get User's Reports

Retrieve user's false positive reports with pagination and filtering.

**Endpoint:** `GET /false-positives`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `reviewed`, `accepted`, `rejected`)
- `reportType` (optional): Filter by type (`phishing`, `breach`, `suspicious_email`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "fp_9x8y7z6w5v4u",
        "reportType": "phishing",
        "status": "pending",
        "emailData": {
          "from": {
            "email": "support@company.com"
          },
          "subject": "Account Verification Required"
        },
        "userFeedback": {
          "reason": "legitimate_sender",
          "confidence": "certain"
        },
        "createdAt": "2026-01-16T10:35:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 27,
      "hasNextPage": true
    }
  }
}
```

### Get Specific Report

Get details of a specific false positive report.

**Endpoint:** `GET /false-positives/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "report": {
      "id": "fp_9x8y7z6w5v4u",
      "reportType": "phishing",
      "status": "reviewed",
      "review": {
        "decision": "accepted",
        "reviewedAt": "2026-01-16T11:00:00Z",
        "notes": "Confirmed legitimate sender"
      },
      "impact": {
        "preventedFutureFlags": 5
      }
    }
  }
}
```

### Get User Statistics

Get statistical overview of user's false positive reports.

**Endpoint:** `GET /false-positives/stats`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `startDate` (optional): Start date (ISO 8601 format)
- `endDate` (optional): End date (ISO 8601 format)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalReports": 15,
      "pendingReports": 3,
      "acceptedReports": 8,
      "acceptanceRate": 80
    },
    "impact": {
      "totalPreventedFlags": 42,
      "contributionScore": 85
    }
  }
}
```

### Check Report Status

Check if a specific item has been reported as a false positive.

**Endpoint:** `GET /false-positives/check/:referenceId`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "isReported": true,
    "report": {
      "id": "fp_9x8y7z6w5v4u",
      "status": "accepted",
      "reportedAt": "2026-01-16T10:35:00Z"
    }
  }
}
```

### Update Report

Update a pending false positive report.

**Endpoint:** `PATCH /false-positives/:id`

**Headers:** 
- `Authorization: Bearer <token>`
- `X-CSRF-Token: <csrf-token>`

**Request Body:**
```json
{
  "userFeedback": {
    "reason": "known_service",
    "comment": "Updated: This is from our payroll service",
    "confidence": "certain"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Report updated successfully"
}
```

**Note:** Only pending reports can be updated.

### Delete Report

Delete a pending false positive report.

**Endpoint:** `DELETE /false-positives/:id`

**Headers:** 
- `Authorization: Bearer <token>`
- `X-CSRF-Token: <csrf-token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Report deleted successfully"
}
```

**Note:** Only pending reports can be deleted.

### Find Similar Reports

Find similar false positive reports based on sender or risk level.

**Endpoint:** `GET /false-positives/similar`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `sender` (optional): Email sender address
- `subject` (optional): Email subject (partial match)
- `riskLevel` (optional): Risk level (`low`, `medium`, `high`, `critical`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "similarReports": [
      {
        "id": "fp_1a2b3c4d",
        "emailData": {
          "from": {
            "email": "support@company.com"
          }
        },
        "status": "accepted",
        "createdAt": "2026-01-15T14:20:00Z"
      }
    ],
    "totalCount": 2,
    "confidenceScore": 85
  }
}
```

---

## API Surface Scanning Endpoints

### Quick Scan

Perform a quick surface scan of a domain.

**Endpoint:** `POST /surface/scan`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "domain": "example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "domain": "example.com",
    "subdomains": 25,
    "endpoints": 150,
    "vulnerabilities": 5,
    "riskScore": 6.5,
    "severityBreakdown": {
      "high": 2,
      "medium": 5,
      "low": 10
    },
    "topIssues": [
      {
        "title": "Exposed API endpoint",
        "severity": "high",
        "description": "Public API endpoint without authentication",
        "recommendation": "Implement authentication middleware"
      }
    ],
    "timestamp": "2024-01-15T10:00:00.000Z"
  }
}
```

### Deep Scan

Perform a comprehensive deep scan.

**Endpoint:** `POST /surface/discover`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "domain": "example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "domain": "example.com",
    "subdomains": [
      {
        "subdomain": "api.example.com",
        "isActive": true,
        "protocol": "https",
        "status": 200
      }
    ],
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/users",
        "responseCode": 200,
        "requiresAuth": false
      }
    ],
    "timestamp": "2024-01-15T10:00:00.000Z"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid request parameters",
  "details": {
    "field": "email",
    "message": "Email is required"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "code": "FORBIDDEN"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found",
  "code": "NOT_FOUND"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **Read operations**: 100 requests per minute
- **Write operations**: 50 requests per minute
- **Scan operations**: 10 requests per minute

Headers returned with each response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642234567
```

---

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response includes:**
```json
{
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 95,
    "hasMore": true
  }
}
```

---

## Webhooks (Coming Soon)

Subscribe to events for real-time notifications:

- `subscription.created`
- `subscription.revoked`
- `breach.detected`
- `scan.completed`
