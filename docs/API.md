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
