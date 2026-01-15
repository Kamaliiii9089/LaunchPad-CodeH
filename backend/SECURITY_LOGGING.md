# Security Event Logging Documentation

## Overview

Comprehensive security event logging system that tracks and records all security-related events including authentication attempts, rate limit violations, suspicious activities, and administrative actions.

## Features

✅ **Structured JSON Logging** - All events logged in JSON format for easy parsing  
✅ **Multiple Log Files** - Separate security and audit logs  
✅ **Automatic Rotation** - Daily log archival (production mode)  
✅ **Automatic Cleanup** - Removes logs older than 30 days  
✅ **Event Tracking** - Real-time counters for monitoring  
✅ **Admin API** - REST endpoints to view logs and metrics  

---

## Logged Events

### Authentication Events

| Event Type | Description | Logged To |
|------------|-------------|-----------|
| `AUTH_SUCCESS` | Successful authentication | security.log, audit.log |
| `AUTH_FAILURE` | Failed authentication attempt | security.log |
| `OAUTH_SUCCESS` | Successful OAuth callback | security.log |
| `OAUTH_FAILURE` | Failed OAuth callback | security.log |
| `TOKEN_FAILURE` | JWT token validation failure | security.log |

### Security Events

| Event Type | Description | Logged To |
|------------|-------------|-----------|
| `RATE_LIMIT_VIOLATION` | Rate limit exceeded | security.log |
| `ACCOUNT_LOCKOUT` | Account locked after multiple failures | security.log, audit.log |
| `SUSPICIOUS_ACTIVITY` | Detected suspicious behavior | security.log, audit.log |

### Account Events

| Event Type | Description | Logged To |
|------------|-------------|-----------|
| `SESSION_CREATED` | New session created | audit.log |
| `SESSION_TERMINATED` | Session ended (logout) | audit.log |
| `ACCOUNT_DELETION` | User account deleted | audit.log |
| `PASSWORD_RESET_SUCCESS` | Password reset successful | security.log, audit.log |
| `PASSWORD_RESET_FAILURE` | Password reset failed | security.log |
| `PERMISSION_DENIED` | Access denied to resource | security.log |

---

## Log Format

All log entries are JSON objects with the following structure:

```json
{
  "timestamp": "2026-01-14T10:30:00.000Z",
  "level": "WARN|INFO|ERROR",
  "eventType": "AUTH_FAILURE",
  "ip": "192.168.1.100",
  "email": "user@example.com",
  "reason": "Invalid credentials",
  "userAgent": "Mozilla/5.0..."
}
```

### Common Fields

- `timestamp` - ISO 8601 timestamp
- `level` - Log level (INFO, WARN, ERROR)
- `eventType` - Type of security event
- `ip` - Client IP address
- `userAgent` - User agent string (when available)

### Event-Specific Fields

Additional fields vary by event type. Examples:

**AUTH_SUCCESS**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "method": "oauth"
}
```

**RATE_LIMIT_VIOLATION**
```json
{
  "endpoint": "/api/auth/google/callback",
  "limit": 5,
  "current": 6
}
```

**ACCOUNT_LOCKOUT**
```json
{
  "attempts": 10,
  "lockoutDuration": 3600
}
```

---

## API Endpoints

### Get Security Metrics

**GET** `/api/security/metrics`

Returns real-time event counters.

**Authentication:** Required (Admin only)

**Response:**
```json
{
  "success": true,
  "metrics": {
    "authSuccess": 125,
    "authFailure": 8,
    "rateLimitViolation": 3,
    "suspiciousActivity": 1,
    "accountLockout": 0,
    "tokenFailure": 5
  },
  "timestamp": "2026-01-14T10:30:00.000Z"
}
```

### Get Recent Security Events

**GET** `/api/security/events?count=100`

Returns recent security events.

**Authentication:** Required (Admin only)

**Query Parameters:**
- `count` - Number of events to return (default: 100)

**Response:**
```json
{
  "success": true,
  "count": 50,
  "events": [
    {
      "timestamp": "2026-01-14T10:30:00.000Z",
      "level": "WARN",
      "eventType": "AUTH_FAILURE",
      "ip": "192.168.1.100",
      "email": "user@example.com",
      "reason": "Invalid credentials"
    }
  ],
  "timestamp": "2026-01-14T10:30:00.000Z"
}
```

### Reset Security Metrics

**POST** `/api/security/metrics/reset`

Resets event counters to zero.

**Authentication:** Required (Admin only)

**Response:**
```json
{
  "success": true,
  "message": "Security metrics reset successfully",
  "timestamp": "2026-01-14T10:30:00.000Z"
}
```

### Archive Logs Manually

**POST** `/api/security/logs/archive`

Triggers manual log archival.

**Authentication:** Required (Admin only)

**Response:**
```json
{
  "success": true,
  "message": "Logs archived successfully",
  "timestamp": "2026-01-14T10:30:00.000Z"
}
```

---

## Log Files

### Location

All logs are stored in: `backend/logs/`

### Active Log Files

- **security.log** - Current security events
- **audit.log** - Current audit trail

### Archived Log Files

- **security_YYYY-MM-DD.log** - Archived security logs
- **audit_YYYY-MM-DD.log** - Archived audit logs

### Log Rotation

**Automatic (Production):**
- Runs daily at midnight
- Archives current logs with date stamp
- Creates fresh log files
- Deletes archives older than 30 days

**Manual:**
```bash
POST /api/security/logs/archive
```

---

## Integration Examples

### View Recent Failed Logins

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/security/events?count=50 \
  | jq '.events[] | select(.eventType == "AUTH_FAILURE")'
```

### Monitor Rate Limit Violations

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/security/metrics \
  | jq '.metrics.rateLimitViolation'
```

### Export Security Logs

```bash
# Export last 24 hours of security events
cat logs/security.log | jq -s 'map(select(.timestamp > "2026-01-13T10:00:00Z"))'
```

---

## Programmatic Usage

### Log Custom Security Event

```javascript
const securityLogger = require('../services/securityLogger');

// Log authentication success
securityLogger.logAuthSuccess(userId, email, ip, 'oauth');

// Log authentication failure
securityLogger.logAuthFailure(email, ip, 'Invalid password');

// Log suspicious activity
securityLogger.logSuspiciousActivity(ip, 'SQL Injection Attempt', details);

// Log account lockout
securityLogger.logAccountLockout(ip, attempts, duration);
```

### Get Event Counters

```javascript
const securityLogger = require('../services/securityLogger');

const metrics = securityLogger.getEventCounters();
console.log('Failed auth attempts:', metrics.authFailure);
```

### Get Recent Events

```javascript
const securityLogger = require('../services/securityLogger');

const events = securityLogger.getRecentEvents(100);
const failedLogins = events.filter(e => e.eventType === 'AUTH_FAILURE');
```

---

## Monitoring & Alerting

### Recommended Alerts

1. **High Failed Login Rate**
   - Threshold: >10 failed logins in 5 minutes
   - Action: Notify security team

2. **Account Lockouts**
   - Threshold: Any lockout event
   - Action: Log and monitor pattern

3. **Rate Limit Violations**
   - Threshold: >50 violations in 1 hour
   - Action: Investigate IP address

4. **Suspicious Activity**
   - Threshold: Any event
   - Action: Immediate notification

### Integration with SIEM

Export logs to SIEM systems:

**Splunk:**
```conf
[monitor://c:/path/to/logs/*.log]
sourcetype = json
index = security
```

**ELK Stack:**
```yaml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /path/to/logs/*.log
  json.keys_under_root: true
```

**Datadog:**
```yaml
logs:
  - type: file
    path: /path/to/logs/*.log
    service: gmail-manager
    source: security
```

---

## Security Best Practices

1. **Protect Log Files**
   - Restrict file permissions (600 or 640)
   - Store on secure, encrypted volume
   - Regular backups

2. **Monitor Regularly**
   - Review logs daily for suspicious patterns
   - Set up automated alerts
   - Track trends over time

3. **Retention Policy**
   - Keep logs for compliance requirements (30+ days)
   - Archive to long-term storage
   - Document retention policy

4. **Access Control**
   - Limit log access to administrators
   - Audit log access
   - Use role-based access control

---

## Troubleshooting

### Logs Not Being Created

**Issue:** No log files in `backend/logs/`

**Solution:**
1. Check directory permissions
2. Verify application has write access
3. Check for disk space issues

### Logs Not Rotating

**Issue:** Archival not happening automatically

**Solution:**
1. Verify `NODE_ENV=production`
2. Check application uptime (must be running at midnight)
3. Trigger manually: `POST /api/security/logs/archive`

### High Disk Usage

**Issue:** Log files consuming too much disk space

**Solution:**
1. Reduce retention period in `securityLogger.js`
2. Implement compression for archived logs
3. Move old archives to external storage

### Missing Events

**Issue:** Some events not appearing in logs

**Solution:**
1. Check console for error messages
2. Verify `securityLogger` is imported correctly
3. Check file write permissions

---

## Performance Impact

- **Memory:** ~10MB for in-memory event counters
- **Disk:** ~1-10MB per day (varies by traffic)
- **CPU:** Negligible (<1% overhead)
- **I/O:** Asynchronous file writes (non-blocking)

---

## Testing

### Test Security Logging

```bash
# Start the server
npm run dev

# Test authentication success
curl -X POST http://localhost:5000/api/auth/google/callback \
  -H "Content-Type: application/json" \
  -d '{"code": "test-code"}'

# Check logs
cat backend/logs/security.log | jq
```

### Verify Log Format

```bash
# Validate JSON format
cat backend/logs/security.log | while read line; do
  echo $line | jq . > /dev/null || echo "Invalid JSON: $line"
done
```

---

## Future Enhancements

- [ ] Real-time log streaming via WebSocket
- [ ] Built-in log viewer dashboard
- [ ] Email/SMS notifications for critical events
- [ ] Machine learning for anomaly detection
- [ ] Integration with cloud logging services
- [ ] Log compression for archived files
- [ ] Geolocation tracking for IP addresses

---

**Last Updated:** January 14, 2026  
**Version:** 1.0.0
