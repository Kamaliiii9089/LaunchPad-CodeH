# False Positive Implementation Guide

Step-by-step guide for integrating the False Positive Reporting System into your application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Integration](#backend-integration)
3. [Frontend Integration](#frontend-integration)
4. [Testing](#testing)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Prerequisites

### Requirements

- Node.js 14+ and npm/yarn
- MongoDB 4.4+
- Express.js application with existing authentication
- JWT-based authentication system
- CSRF protection middleware (optional but recommended)

### Dependencies

The false positive system uses existing dependencies. No additional packages required:

```json
{
  "express": "^4.18.0",
  "mongoose": "^7.0.0",
  "express-validator": "^7.0.0",
  "jsonwebtoken": "^9.0.0"
}
```

---

## Backend Integration

### Step 1: Verify Model is Loaded

The `FalsePositive` model should already be in place at [backend/models/FalsePositive.js](../backend/models/FalsePositive.js).

**Verify the model:**

```javascript
const FalsePositive = require('./models/FalsePositive');
console.log('FalsePositive model loaded:', !!FalsePositive);
```

**Model Schema Overview:**

```javascript
{
  userId: ObjectId,              // User who reported
  reportType: String,            // Type of false positive
  referenceId: String,           // ID of flagged item
  originalDetection: {           // Original detection details
    riskScore: Number,
    riskLevel: String,
    indicators: [String],
    detectionMethod: String,
    timestamp: Date
  },
  emailData: {                   // Email-specific data
    from: { email, name },
    subject: String,
    snippet: String,
    messageId: String,
    links: [String]
  },
  userFeedback: {                // User's feedback
    reason: String,
    comment: String,
    confidence: String
  },
  status: String,                // pending, reviewed, accepted, rejected
  review: {                      // Admin review details
    reviewedBy: ObjectId,
    reviewedAt: Date,
    decision: String,
    notes: String,
    actionTaken: String
  },
  impact: {                      // Impact tracking
    affectedUsers: Number,
    similarReports: [ObjectId],
    preventedFutureFlags: Number
  }
}
```

---

### Step 2: Register Routes

Add the false positive routes to your Express server.

**In `server.js` or `app.js`:**

```javascript
const express = require('express');
const falsePositiveRoutes = require('./routes/falsePositives');

const app = express();

// ... other middleware ...

// Register false positive routes
app.use('/api/false-positives', falsePositiveRoutes);

// ... other routes ...
```

**Verify routes are loaded:**

```bash
npm start

# Check logs for route registration
# You should see routes mounted at /api/false-positives
```

---

### Step 3: Integrate with Phishing Scanner

The phishing scanner should automatically check false positive history before flagging emails.

**In `services/phishingScanner.js`:**

The integration is already implemented. Here's how it works:

```javascript
const FalsePositive = require('../models/FalsePositive');

async function analyzeEmail({ sender, subject, snippet, links, userId, messageId }) {
  // ... normal risk analysis ...
  
  // Check for false positive history
  const falsePositiveCheck = await FalsePositive.checkPattern({
    emailFrom: sender,
    subject: subject,
    riskLevel: riskLevel,
    userId: userId  // Optional: user-specific checking
  });

  // Apply false positive adjustments
  if (falsePositiveCheck.hasFalsePositiveHistory) {
    const confidence = falsePositiveCheck.confidence;
    
    // High confidence (75%+) → Skip flagging entirely
    if (confidence >= 75) {
      return {
        riskScore: 0,
        riskLevel: 'safe',
        falsePositiveOverride: true,
        falsePositiveData: falsePositiveCheck
      };
    }
    
    // Medium confidence (50-74%) → Reduce risk score
    if (confidence >= 50) {
      const reductionFactor = (confidence / 100) * 0.4; // Up to 40% reduction
      riskScore = riskScore * (1 - reductionFactor);
      // Update risk level based on new score
    }
  }

  return {
    riskScore,
    riskLevel,
    indicators,
    falsePositiveData: falsePositiveCheck
  };
}
```

**Usage in your email processing:**

```javascript
const { analyzeEmail } = require('./services/phishingScanner');

// When processing an email
const email = await Email.findOne({ messageId: 'msg_123' });

const analysis = await analyzeEmail({
  sender: email.from.email,
  subject: email.subject,
  snippet: email.snippet,
  links: email.links,
  userId: req.user.id,        // Important: pass user ID for user-specific checks
  messageId: email.messageId
});

if (analysis.falsePositiveOverride) {
  // Don't show alert - high confidence false positive
  console.log('Alert skipped due to false positive history');
} else if (analysis.falsePositiveData?.hasFalsePositiveHistory) {
  // Show alert with reduced severity
  console.log(`Alert severity reduced to ${analysis.riskLevel}`);
} else {
  // Normal alert
  console.log(`Alert: ${analysis.riskLevel} risk detected`);
}
```

---

### Step 4: Integrate Security Logging

The security logger automatically tracks false positive activities.

**In `services/securityLogger.js`:**

The following logging methods are available:

```javascript
const { securityLogger } = require('./services/securityLogger');

// Log when user reports false positive
securityLogger.logFalsePositiveReport({
  userId: 'user_123',
  reportType: 'phishing',
  referenceId: 'msg_456',
  reason: 'legitimate_sender',
  riskLevel: 'high'
});

// Log when admin reviews report
securityLogger.logFalsePositiveReview({
  reportId: 'fp_789',
  reviewerId: 'admin_001',
  decision: 'accepted',
  originalUserId: 'user_123'
});

// Log when detection is overridden
securityLogger.logFalsePositiveOverride({
  emailFrom: 'support@company.com',
  subject: 'Account Update',
  userId: 'user_123',
  confidence: 85,
  reportCount: 3
});
```

**These are automatically called by the controller**, but you can use them for custom integrations.

---

### Step 5: Test the Integration

**Test 1: Submit a false positive report**

```bash
curl -X POST http://localhost:5000/api/false-positives \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "phishing",
    "referenceId": "msg_test_001",
    "originalDetection": {
      "riskScore": 85,
      "riskLevel": "high"
    },
    "emailData": {
      "from": {"email": "test@example.com", "name": "Test"},
      "subject": "Test Subject"
    },
    "userFeedback": {
      "reason": "legitimate_sender",
      "confidence": "certain"
    }
  }'
```

**Test 2: Verify phishing scanner integration**

```javascript
const { analyzeEmail } = require('./services/phishingScanner');
const FalsePositive = require('./models/FalsePositive');

// Create a false positive report first
const report = await FalsePositive.create({
  userId: 'test_user',
  reportType: 'phishing',
  referenceId: 'msg_001',
  emailData: {
    from: { email: 'test@example.com' }
  },
  userFeedback: {
    reason: 'legitimate_sender',
    confidence: 'certain'
  },
  status: 'accepted'
});

// Now test the scanner
const result = await analyzeEmail({
  sender: 'test@example.com',
  subject: 'Test',
  snippet: 'Test',
  userId: 'test_user'
});

console.log('False positive override:', result.falsePositiveOverride);
// Should be true if confidence is high enough
```

---

## Frontend Integration

### Step 1: Add Report Button to Alerts

Add a "Report False Positive" button to your security alerts.

**Example React Component:**

```jsx
import React, { useState } from 'react';
import axios from 'axios';

function SecurityAlert({ email, detection, onReportSuccess }) {
  const [showReportForm, setShowReportForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleReport = async (feedbackData) => {
    setSubmitting(true);
    
    try {
      const response = await axios.post(
        '/api/false-positives',
        {
          reportType: 'phishing',
          referenceId: email.messageId,
          originalDetection: detection,
          emailData: {
            from: email.from,
            subject: email.subject,
            snippet: email.snippet,
            messageId: email.messageId,
            links: email.links
          },
          userFeedback: feedbackData
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-CSRF-Token': getCsrfToken()
          }
        }
      );

      onReportSuccess(response.data);
      setShowReportForm(false);
      
      // Show success message
      alert('Thank you! Your report has been submitted.');
      
    } catch (error) {
      console.error('Error reporting false positive:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="security-alert">
      <div className="alert-header">
        <span className="alert-icon">⚠️</span>
        <h3>Security Alert</h3>
      </div>
      
      <div className="alert-content">
        <p><strong>Risk Level:</strong> {detection.riskLevel}</p>
        <p><strong>From:</strong> {email.from.email}</p>
        <p><strong>Subject:</strong> {email.subject}</p>
        
        {detection.indicators && (
          <div className="indicators">
            <strong>Detected Issues:</strong>
            <ul>
              {detection.indicators.map((indicator, idx) => (
                <li key={idx}>{indicator}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="alert-actions">
        <button className="btn-danger" onClick={() => handleDeleteEmail()}>
          Delete Email
        </button>
        <button className="btn-secondary" onClick={() => setShowReportForm(true)}>
          Report False Positive
        </button>
      </div>

      {showReportForm && (
        <FalsePositiveForm
          onSubmit={handleReport}
          onCancel={() => setShowReportForm(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}

function FalsePositiveForm({ onSubmit, onCancel, submitting }) {
  const [reason, setReason] = useState('legitimate_sender');
  const [comment, setComment] = useState('');
  const [confidence, setConfidence] = useState('certain');

  const reasons = [
    { value: 'legitimate_sender', label: 'Legitimate sender' },
    { value: 'known_service', label: 'Known service' },
    { value: 'expected_email', label: 'Expected email' },
    { value: 'incorrect_analysis', label: 'Incorrect analysis' },
    { value: 'trusted_domain', label: 'Trusted domain' },
    { value: 'false_urgency_detection', label: 'False urgency detection' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ reason, comment, confidence });
  };

  return (
    <form onSubmit={handleSubmit} className="false-positive-form">
      <h4>Report False Positive</h4>
      
      <div className="form-group">
        <label>Reason *</label>
        <select value={reason} onChange={(e) => setReason(e.target.value)} required>
          {reasons.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Additional Details (optional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Please provide any additional context..."
          maxLength={1000}
          rows={4}
        />
        <small>{comment.length}/1000 characters</small>
      </div>

      <div className="form-group">
        <label>Confidence Level</label>
        <select value={confidence} onChange={(e) => setConfidence(e.target.value)}>
          <option value="certain">Certain - I'm sure this is safe</option>
          <option value="likely">Likely - Probably safe</option>
          <option value="unsure">Unsure - Not completely sure</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Submitting...' : 'Submit Report'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default SecurityAlert;
```

---

### Step 2: Add Reports Dashboard

Create a page where users can view their reports.

**Example Reports Page:**

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function FalsePositiveReports() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [filter]);

  const fetchReports = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await axios.get('/api/false-positives', {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setReports(response.data.data.reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/false-positives/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'orange', text: 'Pending Review' },
      reviewed: { color: 'blue', text: 'Reviewed' },
      accepted: { color: 'green', text: 'Accepted' },
      rejected: { color: 'red', text: 'Rejected' },
      needs_more_info: { color: 'yellow', text: 'Needs Info' }
    };
    const badge = badges[status] || badges.pending;
    return <span className={`badge badge-${badge.color}`}>{badge.text}</span>;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="reports-page">
      <h1>False Positive Reports</h1>

      {/* Statistics */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>{stats.summary.totalReports}</h3>
            <p>Total Reports</p>
          </div>
          <div className="stat-card">
            <h3>{stats.summary.acceptedReports}</h3>
            <p>Accepted</p>
          </div>
          <div className="stat-card">
            <h3>{stats.summary.acceptanceRate}%</h3>
            <p>Acceptance Rate</p>
          </div>
          <div className="stat-card">
            <h3>{stats.impact.totalPreventedFlags}</h3>
            <p>Prevented Flags</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'active' : ''}>
          All
        </button>
        <button onClick={() => setFilter('pending')} className={filter === 'pending' ? 'active' : ''}>
          Pending
        </button>
        <button onClick={() => setFilter('accepted')} className={filter === 'accepted' ? 'active' : ''}>
          Accepted
        </button>
        <button onClick={() => setFilter('rejected')} className={filter === 'rejected' ? 'active' : ''}>
          Rejected
        </button>
      </div>

      {/* Reports List */}
      <div className="reports-list">
        {reports.length === 0 ? (
          <p>No reports found.</p>
        ) : (
          reports.map(report => (
            <div key={report.id} className="report-card">
              <div className="report-header">
                <div>
                  <h3>{report.emailData?.subject || 'N/A'}</h3>
                  <p className="sender">{report.emailData?.from?.email}</p>
                </div>
                {getStatusBadge(report.status)}
              </div>

              <div className="report-details">
                <p><strong>Type:</strong> {report.reportType}</p>
                <p><strong>Reason:</strong> {report.userFeedback.reason}</p>
                {report.userFeedback.comment && (
                  <p><strong>Comment:</strong> {report.userFeedback.comment}</p>
                )}
                <p><strong>Reported:</strong> {new Date(report.createdAt).toLocaleDateString()}</p>
              </div>

              {report.review && (
                <div className="review-details">
                  <h4>Review</h4>
                  <p><strong>Decision:</strong> {report.review.decision}</p>
                  {report.review.notes && <p><strong>Notes:</strong> {report.review.notes}</p>}
                  <p><strong>Reviewed:</strong> {new Date(report.review.reviewedAt).toLocaleDateString()}</p>
                </div>
              )}

              {report.impact && report.impact.preventedFutureFlags > 0 && (
                <div className="impact-badge">
                  <span>✓ Prevented {report.impact.preventedFutureFlags} future alerts</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default FalsePositiveReports;
```

---

### Step 3: Add CSS Styles

```css
/* Security Alert Styles */
.security-alert {
  border: 2px solid #ff9800;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  background: #fff3e0;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.alert-icon {
  font-size: 24px;
}

.alert-content {
  margin-bottom: 20px;
}

.indicators {
  margin-top: 15px;
  padding: 10px;
  background: white;
  border-radius: 4px;
}

.alert-actions {
  display: flex;
  gap: 10px;
}

/* False Positive Form */
.false-positive-form {
  margin-top: 20px;
  padding: 20px;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
}

.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

/* Reports Page */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.stat-card h3 {
  font-size: 32px;
  margin: 0 0 10px 0;
  color: #2196f3;
}

.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.filter-bar button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.filter-bar button.active {
  background: #2196f3;
  color: white;
  border-color: #2196f3;
}

.report-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 15px;
}

.badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.badge-orange { background: #fff3e0; color: #e65100; }
.badge-blue { background: #e3f2fd; color: #1565c0; }
.badge-green { background: #e8f5e9; color: #2e7d32; }
.badge-red { background: #ffebee; color: #c62828; }
.badge-yellow { background: #fffde7; color: #f57f17; }

.impact-badge {
  margin-top: 15px;
  padding: 10px;
  background: #e8f5e9;
  border-radius: 4px;
  color: #2e7d32;
}
```

---

## Testing

### Unit Tests

```javascript
// test/falsePositive.test.js
const request = require('supertest');
const app = require('../server');
const FalsePositive = require('../models/FalsePositive');

describe('False Positive API', () => {
  let authToken;
  let testReport;

  beforeAll(async () => {
    // Login and get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    authToken = loginRes.body.data.token;
  });

  test('Submit false positive report', async () => {
    const res = await request(app)
      .post('/api/false-positives')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reportType: 'phishing',
        referenceId: 'msg_test_001',
        userFeedback: {
          reason: 'legitimate_sender',
          confidence: 'certain'
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reportId).toBeDefined();
    testReport = res.body.data;
  });

  test('Get user reports', async () => {
    const res = await request(app)
      .get('/api/false-positives')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.reports).toBeInstanceOf(Array);
  });

  test('Get user statistics', async () => {
    const res = await request(app)
      .get('/api/false-positives/stats')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBeDefined();
  });
});
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All routes registered in server.js
- [ ] MongoDB indexes created (automatic on first use)
- [ ] Environment variables configured
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Security logging enabled
- [ ] Frontend components integrated
- [ ] Tests passing

### Deployment Steps

1. **Deploy Backend**
   ```bash
   git pull origin main
   npm install
   npm run build  # if applicable
   pm2 restart app
   ```

2. **Verify Deployment**
   ```bash
   curl http://your-domain.com/api/health
   ```

3. **Monitor Logs**
   ```bash
   tail -f backend/logs/security.log | grep FALSE_POSITIVE
   ```

### Post-Deployment Verification

```bash
# Test API endpoint
curl http://your-domain.com/api/false-positives/stats \
  -H "Authorization: Bearer TOKEN"

# Check database
mongo
> use launchpad
> db.falsepositives.count()
> db.falsepositives.find().limit(1)
```

---

## Troubleshooting

### Common Issues

#### 1. Routes not working (404)

**Problem:** API returns 404 for false positive endpoints

**Solution:**
```javascript
// Check if routes are registered in server.js
const falsePositiveRoutes = require('./routes/falsePositives');
app.use('/api/false-positives', falsePositiveRoutes);

// Verify route file exists
// backend/routes/falsePositives.js
```

#### 2. Database errors

**Problem:** MongoDB connection or validation errors

**Solution:**
```javascript
// Check MongoDB connection
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

// Verify FalsePositive model is loaded
const FalsePositive = require('./models/FalsePositive');
console.log('Model loaded:', FalsePositive.modelName);
```

#### 3. False positive not affecting detection

**Problem:** Reports submitted but detection still flags emails

**Solution:**
```javascript
// Ensure report is accepted
await FalsePositive.findByIdAndUpdate(reportId, { 
  status: 'accepted' 
});

// Check if phishing scanner is calling checkPattern
const falsePositiveCheck = await FalsePositive.checkPattern({
  emailFrom: 'sender@example.com',
  riskLevel: 'high'
});
console.log('FP Check:', falsePositiveCheck);
```

#### 4. CSRF token errors

**Problem:** 403 errors with CSRF token mismatch

**Solution:**
```javascript
// Ensure CSRF middleware is configured correctly
const csrf = require('csurf');
app.use(csrf({ cookie: true }));

// Send CSRF token to frontend
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

---

## Best Practices

### 1. User Experience

✅ **DO:**
- Make reporting easy with one-click access
- Provide clear feedback after submission
- Show report status updates
- Explain how their feedback helps

❌ **DON'T:**
- Require extensive forms for simple reports
- Hide the report button
- Leave users wondering about status
- Over-complicate the process

### 2. Data Quality

✅ **DO:**
- Encourage detailed comments
- Validate input on both client and server
- Track confidence levels
- Review patterns regularly

❌ **DON'T:**
- Accept reports without context
- Skip validation
- Ignore low-confidence reports
- Let reports pile up unreviewed

### 3. Security

✅ **DO:**
- Require authentication for all endpoints
- Use CSRF protection
- Rate limit submissions
- Log all activities
- Sanitize user input

❌ **DON'T:**
- Allow anonymous reports
- Skip input validation
- Expose sensitive data
- Trust client-side validation alone

### 4. Performance

✅ **DO:**
- Index frequently queried fields
- Paginate large result sets
- Cache pattern detection results
- Use background jobs for analysis

❌ **DON'T:**
- Load all reports at once
- Query without indexes
- Block requests with heavy processing
- Store unnecessary data

---

## Advanced Features

### Custom Whitelist Integration

```javascript
// Auto-add accepted false positives to whitelist
FalsePositive.watch().on('change', async (change) => {
  if (change.operationType === 'update' && 
      change.updateDescription.updatedFields.status === 'accepted') {
    
    const report = await FalsePositive.findById(change.documentKey._id);
    
    // Add sender to whitelist
    if (report.emailData?.from?.email) {
      await Whitelist.create({
        email: report.emailData.from.email,
        reason: 'false_positive',
        reportId: report._id
      });
    }
  }
});
```

### Machine Learning Integration

```javascript
// Export data for ML training
async function exportTrainingData() {
  const reports = await FalsePositive.find({ status: 'accepted' })
    .select('emailData originalDetection userFeedback')
    .lean();

  const trainingData = reports.map(r => ({
    features: {
      sender: r.emailData.from.email,
      subject: r.emailData.subject,
      indicators: r.originalDetection.indicators,
      riskScore: r.originalDetection.riskScore
    },
    label: 'false_positive',
    confidence: r.userFeedback.confidence
  }));

  return trainingData;
}
```

---

## Support & Resources

- **API Reference:** [FALSE_POSITIVE_API.md](./FALSE_POSITIVE_API.md)
- **System Overview:** [FALSE_POSITIVE_SUMMARY.md](./FALSE_POSITIVE_SUMMARY.md)
- **Source Code:** `backend/` directory
- **GitHub Issues:** [Report bugs or request features](https://github.com/your-org/LaunchPad-CodeH/issues)

---

**Last Updated:** January 16, 2026  
**Version:** 1.0.0  
**Status:** Production Ready
