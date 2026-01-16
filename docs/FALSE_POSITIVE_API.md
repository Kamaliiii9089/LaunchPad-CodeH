# False Positive API Documentation

Complete API reference for the False Positive Reporting System.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [User Endpoints](#user-endpoints)
- [Admin Endpoints](#admin-endpoints)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Overview

The False Positive API allows users to report incorrectly flagged security alerts and provides administrators with tools to review and manage these reports. The system learns from user feedback to improve detection accuracy over time.

**Base URL:** `/api/false-positives`

---

## Authentication

All endpoints require JWT authentication via the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Some endpoints also require CSRF protection via the `X-CSRF-Token` header.

---

## User Endpoints

### 1. Submit False Positive Report

Submit a report for an incorrectly flagged item.

**Endpoint:** `POST /api/false-positives`

**Headers:**
```
Authorization: Bearer <token>
X-CSRF-Token: <csrf-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "reportType": "phishing",
  "referenceId": "msg_1a2b3c4d5e6f",
  "originalDetection": {
    "riskScore": 85,
    "riskLevel": "high",
    "indicators": [
      "suspicious_url",
      "urgency_keywords",
      "brand_impersonation"
    ],
    "detectionMethod": "Heuristic Analysis",
    "timestamp": "2026-01-16T10:30:00Z"
  },
  "emailData": {
    "from": {
      "email": "support@company.com",
      "name": "Company Support"
    },
    "subject": "Urgent: Account Verification Required",
    "snippet": "Dear customer, please verify your account...",
    "messageId": "msg_1a2b3c4d5e6f",
    "links": ["https://company.com/verify"]
  },
  "userFeedback": {
    "reason": "legitimate_sender",
    "comment": "This is my company's official IT support team. I verified with our internal directory.",
    "confidence": "certain"
  },
  "metadata": {
    "reportSource": "email_alert",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reportType` | String | Yes | Type: `phishing`, `breach`, `suspicious_email`, `malicious_url`, `other` |
| `referenceId` | String | Yes | ID of the flagged item (email ID, message ID, etc.) |
| `originalDetection` | Object | No | Original detection details |
| `originalDetection.riskScore` | Number | No | 0-100 risk score |
| `originalDetection.riskLevel` | String | No | `low`, `medium`, `high`, `critical` |
| `originalDetection.indicators` | Array | No | List of detected indicators |
| `originalDetection.detectionMethod` | String | No | Detection method used |
| `emailData` | Object | No | Email-specific data (for email-related reports) |
| `emailData.from` | Object | No | Sender information |
| `emailData.subject` | String | No | Email subject |
| `emailData.snippet` | String | No | Email preview text |
| `emailData.links` | Array | No | URLs found in email |
| `userFeedback` | Object | Yes | User's feedback |
| `userFeedback.reason` | String | Yes | Reason: `legitimate_sender`, `known_service`, `expected_email`, `incorrect_analysis`, `trusted_domain`, `false_urgency_detection`, `other` |
| `userFeedback.comment` | String | No | Additional context (max 1000 characters) |
| `userFeedback.confidence` | String | No | Confidence level: `certain` (default), `likely`, `unsure` |

**Success Response:** `201 Created`
```json
{
  "success": true,
  "message": "False positive report submitted successfully",
  "data": {
    "reportId": "fp_9x8y7z6w5v4u",
    "status": "pending",
    "createdAt": "2026-01-16T10:35:00Z",
    "similarReports": {
      "count": 2,
      "reports": [
        {
          "id": "fp_1a2b3c4d",
          "userId": "user_xxx",
          "createdAt": "2026-01-15T14:20:00Z",
          "status": "accepted"
        }
      ]
    }
  }
}
```

**Error Responses:**

```json
// 400 Bad Request - Missing required fields
{
  "success": false,
  "message": "Report type, reference ID, and feedback reason are required"
}

// 404 Not Found - Referenced item not found
{
  "success": false,
  "message": "Referenced email not found or does not belong to you"
}

// 409 Conflict - Duplicate report
{
  "success": false,
  "message": "You have already reported this item as a false positive",
  "reportId": "fp_existing123"
}

// 429 Too Many Requests - Rate limit exceeded
{
  "success": false,
  "message": "Too many reports. Please try again later.",
  "retryAfter": 60
}
```

---

### 2. Get User's Reports

Retrieve a paginated list of the authenticated user's false positive reports.

**Endpoint:** `GET /api/false-positives`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | String | No | All | Filter by status: `pending`, `reviewed`, `accepted`, `rejected`, `needs_more_info` |
| `reportType` | String | No | All | Filter by type: `phishing`, `breach`, `suspicious_email`, `malicious_url`, `other` |
| `page` | Integer | No | 1 | Page number (min: 1) |
| `limit` | Integer | No | 20 | Items per page (min: 1, max: 100) |
| `sortBy` | String | No | createdAt | Sort field: `createdAt`, `status`, `reportType` |
| `sortOrder` | String | No | desc | Sort order: `asc`, `desc` |

**Example Request:**
```
GET /api/false-positives?status=pending&page=1&limit=10
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "fp_9x8y7z6w5v4u",
        "reportType": "phishing",
        "referenceId": "msg_1a2b3c4d5e6f",
        "status": "pending",
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
          "subject": "Urgent: Account Verification Required"
        },
        "userFeedback": {
          "reason": "legitimate_sender",
          "comment": "This is my company's official IT support team.",
          "confidence": "certain"
        },
        "createdAt": "2026-01-16T10:35:00Z",
        "updatedAt": "2026-01-16T10:35:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 27,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 3. Get Specific Report

Retrieve details of a specific false positive report.

**Endpoint:** `GET /api/false-positives/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id`: Report ID

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "report": {
      "id": "fp_9x8y7z6w5v4u",
      "reportType": "phishing",
      "referenceId": "msg_1a2b3c4d5e6f",
      "status": "reviewed",
      "originalDetection": {
        "riskScore": 85,
        "riskLevel": "high",
        "indicators": ["suspicious_url", "urgency_keywords"],
        "detectionMethod": "Heuristic Analysis",
        "timestamp": "2026-01-16T10:30:00Z"
      },
      "emailData": {
        "from": {
          "email": "support@company.com",
          "name": "Company Support"
        },
        "subject": "Urgent: Account Verification Required",
        "snippet": "Dear customer, please verify your account...",
        "messageId": "msg_1a2b3c4d5e6f",
        "links": ["https://company.com/verify"]
      },
      "userFeedback": {
        "reason": "legitimate_sender",
        "comment": "This is my company's official IT support team.",
        "confidence": "certain"
      },
      "review": {
        "reviewedBy": "admin_5x6y7z",
        "reviewedAt": "2026-01-16T11:00:00Z",
        "decision": "accepted",
        "notes": "Confirmed legitimate sender. Updated whitelist.",
        "actionTaken": "whitelist_updated"
      },
      "impact": {
        "affectedUsers": 1,
        "similarReports": ["fp_1a2b3c4d", "fp_2e3f4g5h"],
        "preventedFutureFlags": 5
      },
      "createdAt": "2026-01-16T10:35:00Z",
      "updatedAt": "2026-01-16T11:00:00Z"
    }
  }
}
```

**Error Response:** `404 Not Found`
```json
{
  "success": false,
  "message": "Report not found or access denied"
}
```

---

### 4. Update Report

Update a pending false positive report (only allowed for pending reports).

**Endpoint:** `PATCH /api/false-positives/:id`

**Headers:**
```
Authorization: Bearer <token>
X-CSRF-Token: <csrf-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userFeedback": {
    "reason": "known_service",
    "comment": "Updated: This is from our payroll service provider",
    "confidence": "certain"
  }
}
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Report updated successfully",
  "data": {
    "report": {
      "id": "fp_9x8y7z6w5v4u",
      "status": "pending",
      "userFeedback": {
        "reason": "known_service",
        "comment": "Updated: This is from our payroll service provider",
        "confidence": "certain"
      },
      "updatedAt": "2026-01-16T10:45:00Z"
    }
  }
}
```

**Error Response:** `403 Forbidden`
```json
{
  "success": false,
  "message": "Cannot update report that has been reviewed"
}
```

---

### 5. Delete Report

Delete a pending false positive report.

**Endpoint:** `DELETE /api/false-positives/:id`

**Headers:**
```
Authorization: Bearer <token>
X-CSRF-Token: <csrf-token>
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Report deleted successfully"
}
```

**Error Responses:**
```json
// 403 Forbidden - Cannot delete reviewed reports
{
  "success": false,
  "message": "Cannot delete report that has been reviewed"
}

// 404 Not Found
{
  "success": false,
  "message": "Report not found or access denied"
}
```

---

### 6. Get User Statistics

Get statistical overview of the user's false positive reports.

**Endpoint:** `GET /api/false-positives/stats`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | ISO Date | No | Start date for filtering (default: 30 days ago) |
| `endDate` | ISO Date | No | End date for filtering (default: now) |

**Example Request:**
```
GET /api/false-positives/stats?startDate=2026-01-01&endDate=2026-01-31
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalReports": 15,
      "pendingReports": 3,
      "reviewedReports": 10,
      "acceptedReports": 8,
      "rejectedReports": 2,
      "acceptanceRate": 80
    },
    "byType": {
      "phishing": 10,
      "suspicious_email": 3,
      "malicious_url": 2
    },
    "byReason": {
      "legitimate_sender": 6,
      "known_service": 4,
      "expected_email": 3,
      "incorrect_analysis": 2
    },
    "impact": {
      "totalPreventedFlags": 42,
      "avgPreventedPerReport": 2.8,
      "contributionScore": 85
    },
    "timeline": [
      {
        "date": "2026-01-15",
        "submitted": 2,
        "reviewed": 1,
        "accepted": 1
      },
      {
        "date": "2026-01-16",
        "submitted": 3,
        "reviewed": 2,
        "accepted": 1
      }
    ]
  }
}
```

---

### 7. Check Report Status

Check if a specific item has been reported as a false positive.

**Endpoint:** `GET /api/false-positives/check/:referenceId`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `referenceId`: The reference ID of the item to check

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "isReported": true,
    "report": {
      "id": "fp_9x8y7z6w5v4u",
      "status": "accepted",
      "reportedAt": "2026-01-16T10:35:00Z",
      "reviewedAt": "2026-01-16T11:00:00Z"
    }
  }
}
```

```json
{
  "success": true,
  "data": {
    "isReported": false
  }
}
```

---

### 8. Find Similar Reports

Find similar false positive reports based on sender, subject, or risk level.

**Endpoint:** `GET /api/false-positives/similar`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sender` | String | No | Email sender address |
| `subject` | String | No | Email subject (partial match) |
| `riskLevel` | String | No | Risk level: `low`, `medium`, `high`, `critical` |

**Example Request:**
```
GET /api/false-positives/similar?sender=support@company.com&riskLevel=high
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "similarReports": [
      {
        "id": "fp_1a2b3c4d",
        "userId": "user_xxx",
        "reportType": "phishing",
        "emailData": {
          "from": {
            "email": "support@company.com",
            "name": "Company Support"
          },
          "subject": "Account Update Required"
        },
        "status": "accepted",
        "createdAt": "2026-01-15T14:20:00Z"
      },
      {
        "id": "fp_2e3f4g5h",
        "userId": "user_yyy",
        "reportType": "phishing",
        "emailData": {
          "from": {
            "email": "support@company.com",
            "name": "Support Team"
          },
          "subject": "Urgent: Verify Your Account"
        },
        "status": "accepted",
        "createdAt": "2026-01-14T09:15:00Z"
      }
    ],
    "totalCount": 2,
    "confidenceScore": 85
  }
}
```

---

## Admin Endpoints

> **Note:** Admin endpoints require additional role-based authorization. Implementation pending.

### 9. Review Report (Admin)

Review and decide on a false positive report.

**Endpoint:** `POST /api/false-positives/:id/review`

**Headers:**
```
Authorization: Bearer <admin-token>
X-CSRF-Token: <csrf-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "decision": "accepted",
  "notes": "Confirmed legitimate sender. Updated whitelist.",
  "actionTaken": "whitelist_updated"
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `decision` | String | Yes | `accepted`, `rejected`, `needs_more_info` |
| `notes` | String | No | Admin notes about the review |
| `actionTaken` | String | No | Action taken: `whitelist_updated`, `detection_adjusted`, `no_action`, `escalated` |

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Report reviewed successfully",
  "data": {
    "report": {
      "id": "fp_9x8y7z6w5v4u",
      "status": "accepted",
      "review": {
        "reviewedBy": "admin_5x6y7z",
        "reviewedAt": "2026-01-16T11:00:00Z",
        "decision": "accepted",
        "notes": "Confirmed legitimate sender. Updated whitelist.",
        "actionTaken": "whitelist_updated"
      }
    }
  }
}
```

---

### 10. Get All Reports (Admin)

Retrieve all false positive reports with advanced filtering.

**Endpoint:** `GET /api/false-positives/admin/all`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | String | Filter by status |
| `reportType` | String | Filter by type |
| `userId` | String | Filter by user |
| `startDate` | ISO Date | Filter by date range start |
| `endDate` | ISO Date | Filter by date range end |
| `page` | Integer | Page number |
| `limit` | Integer | Items per page |

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "reports": [...],
    "pagination": {...},
    "summary": {
      "totalReports": 150,
      "pendingReviews": 25,
      "acceptanceRate": 75,
      "topReasons": [...]
    }
  }
}
```

---

### 11. Get System Statistics (Admin)

Get comprehensive system-wide statistics.

**Endpoint:** `GET /api/false-positives/admin/stats`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | ISO Date | Start date for analysis |
| `endDate` | ISO Date | End date for analysis |

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalReports": 1250,
      "totalUsers": 350,
      "avgReportsPerUser": 3.57,
      "falsePositiveRate": 4.2
    },
    "statusBreakdown": {
      "pending": 125,
      "reviewed": 800,
      "accepted": 600,
      "rejected": 200,
      "needs_more_info": 125
    },
    "impact": {
      "totalPreventedFlags": 5420,
      "systemAccuracyImprovement": 12.5,
      "userSatisfactionScore": 87
    },
    "topSenders": [
      {
        "email": "support@company.com",
        "reportCount": 45,
        "acceptanceRate": 91
      }
    ],
    "trends": {
      "weeklyGrowth": 5.2,
      "seasonality": "increasing"
    }
  }
}
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "userFeedback.reason",
      "message": "Invalid feedback reason",
      "value": "invalid_value"
    }
  ]
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Rate Limiting

False positive endpoints are rate-limited to prevent abuse:

| Endpoint | Limit |
|----------|-------|
| POST /api/false-positives | 10 requests per hour per user |
| GET /api/false-positives | 100 requests per hour per user |
| GET /api/false-positives/:id | 100 requests per hour per user |
| PATCH /api/false-positives/:id | 20 requests per hour per user |
| DELETE /api/false-positives/:id | 20 requests per hour per user |

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1642348800
```

---

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

// Submit a false positive report
async function submitFalsePositive(token, csrfToken, reportData) {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/false-positives',
      reportData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Report submitted:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Get user's reports
async function getUserReports(token, filters = {}) {
  try {
    const params = new URLSearchParams(filters);
    const response = await axios.get(
      `http://localhost:5000/api/false-positives?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}
```

### Python

```python
import requests

def submit_false_positive(token, csrf_token, report_data):
    headers = {
        'Authorization': f'Bearer {token}',
        'X-CSRF-Token': csrf_token,
        'Content-Type': 'application/json'
    }
    
    response = requests.post(
        'http://localhost:5000/api/false-positives',
        json=report_data,
        headers=headers
    )
    
    if response.status_code == 201:
        return response.json()
    else:
        raise Exception(f"Error: {response.json()}")

def get_user_reports(token, status=None, page=1):
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    params = {'page': page}
    if status:
        params['status'] = status
    
    response = requests.get(
        'http://localhost:5000/api/false-positives',
        headers=headers,
        params=params
    )
    
    return response.json()
```

### cURL

```bash
# Submit a false positive report
curl -X POST http://localhost:5000/api/false-positives \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "phishing",
    "referenceId": "msg_123",
    "userFeedback": {
      "reason": "legitimate_sender",
      "comment": "This is my company support",
      "confidence": "certain"
    }
  }'

# Get user reports
curl -X GET "http://localhost:5000/api/false-positives?status=pending&page=1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get user statistics
curl -X GET http://localhost:5000/api/false-positives/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Testing

### Test Data

```json
{
  "reportType": "phishing",
  "referenceId": "test_msg_001",
  "originalDetection": {
    "riskScore": 75,
    "riskLevel": "high",
    "indicators": ["suspicious_url", "urgency_keywords"],
    "detectionMethod": "Heuristic Analysis"
  },
  "emailData": {
    "from": {
      "email": "test@example.com",
      "name": "Test Sender"
    },
    "subject": "Test Email Subject",
    "snippet": "This is a test email...",
    "messageId": "test_msg_001",
    "links": ["https://example.com"]
  },
  "userFeedback": {
    "reason": "legitimate_sender",
    "comment": "Testing false positive reporting",
    "confidence": "certain"
  }
}
```

---

## Support

For issues or questions:
- GitHub Issues: [LaunchPad-CodeH Issues](https://github.com/your-org/LaunchPad-CodeH/issues)
- Documentation: [FALSE_POSITIVE_SUMMARY.md](./FALSE_POSITIVE_SUMMARY.md)
- Implementation Guide: [FALSE_POSITIVE_IMPLEMENTATION.md](./FALSE_POSITIVE_IMPLEMENTATION.md)

---

**Last Updated:** January 16, 2026  
**API Version:** 1.0.0  
**Status:** Production Ready
