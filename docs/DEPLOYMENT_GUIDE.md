# 🚀 Rate Limiting Deployment Guide

## Overview

This guide walks you through deploying the rate limiting implementation to your production environment.

## Prerequisites

- [x] Rate limiting code merged to main branch
- [ ] Production environment access
- [ ] Access to production `.env` file
- [ ] Monitoring/logging system configured
- [ ] Support team notified

---

## Step-by-Step Deployment

### Phase 1: Pre-Deployment (15 minutes)

#### 1.1 Verify Local Installation

```bash
# Navigate to backend directory
cd backend

# Verify all dependencies are installed
npm install

# Check for any errors
npm run dev
```

#### 1.2 Run Local Tests

```bash
# Set up for testing
# Edit .env and set: SKIP_RATE_LIMIT_DEV=false

# Run the rate limit test
npm run test:rate-limit

# Expected: Should see rate limiting kick in after 5 attempts
# ✓ Successful:      5
# ✗ Rate Limited:    5
```

#### 1.3 Review Configuration

Verify your `.env` file has these settings:

```bash
# Rate Limiting Configuration
AUTH_RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
AUTH_RATE_LIMIT_MAX_REQUESTS=5         # 5 attempts for auth
AUTH_MODERATE_WINDOW_MS=900000
AUTH_MODERATE_MAX_REQUESTS=50
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX_REQUESTS=100
SKIP_RATE_LIMIT_DEV=true              # For development only
```

---

### Phase 2: Production Deployment (30 minutes)

#### 2.1 Update Production Code

```bash
# On your production server
git pull origin main

# Install any new dependencies (none required - uses existing express-rate-limit)
cd backend
npm install

# Verify no errors
node -c server.js
node -c middleware/rateLimiter.js
node -c routes/auth.js
```

#### 2.2 Update Production Environment Variables

**CRITICAL**: Edit your production `.env` file:

```bash
# Production Rate Limiting Configuration - STRICTER LIMITS
AUTH_RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
AUTH_RATE_LIMIT_MAX_REQUESTS=3         # ⚠️ ONLY 3 attempts in production!
AUTH_MODERATE_WINDOW_MS=900000
AUTH_MODERATE_MAX_REQUESTS=30          # Reduced for production
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX_REQUESTS=60         # Reduced for production
SKIP_RATE_LIMIT_DEV=false              # ⚠️ MUST BE FALSE in production!
```

#### 2.3 Verify Trust Proxy Configuration

If you're behind a load balancer or reverse proxy (AWS ELB, Nginx, etc.), ensure this is in your `server.js`:

```javascript
app.set('trust proxy', true);
```

This is already configured, but verify it's present.

---

### Phase 3: Staged Rollout (Recommended)

#### 3.1 Option A: Blue-Green Deployment

1. Deploy to green environment
2. Test rate limiting on green
3. Switch traffic to green
4. Monitor for issues
5. Rollback to blue if needed

#### 3.2 Option B: Canary Deployment

1. Deploy to 10% of servers
2. Monitor for 1 hour
3. Increase to 50% if stable
4. Full deployment after 24 hours

#### 3.3 Option C: Direct Deployment (For Smaller Apps)

```bash
# Restart your application
pm2 restart app
# or
systemctl restart your-app
# or
docker-compose down && docker-compose up -d
```

---

### Phase 4: Post-Deployment Verification (1 hour)

#### 4.1 Smoke Tests

Test that the API is working:

```bash
# Health check
curl http://your-domain.com/health

# Test rate limiting (should succeed)
curl http://your-domain.com/api/auth/google/url

# Test rate limiting (should fail after 3 attempts)
for i in {1..5}; do
  curl -i http://your-domain.com/api/auth/google/url
  echo "\n--- Attempt $i ---"
  sleep 2
done
```

#### 4.2 Check Logs

Look for rate limiting logs:

```bash
# Check application logs
tail -f /var/log/your-app/app.log

# Look for:
# ⚠️ Rate limit exceeded for IP: xxx.xxx.xxx.xxx
# ✅ Cleared failed login attempts for IP: xxx.xxx.xxx.xxx
```

#### 4.3 Monitor Metrics

Check your monitoring dashboard for:
- ✅ Response times (should be <50ms slower)
- ✅ Error rates (429 responses)
- ✅ CPU/Memory usage (minimal impact)

---

### Phase 5: Monitoring Setup (30 minutes)

#### 5.1 Set Up Alerts

Configure alerts for:

```yaml
alerts:
  - name: "High Rate Limit Rejections"
    condition: "http_status_429_count > 100 in 5 minutes"
    action: "notify_security_team"
    
  - name: "Multiple Lockouts"
    condition: "login_lockout_count > 10 in 1 hour"
    action: "notify_security_team + create_incident"
    
  - name: "Rate Limiting Not Working"
    condition: "rate_limit_enabled = false"
    action: "notify_devops_team"
```

#### 5.2 Dashboard Metrics

Add these metrics to your dashboard:

1. **Rate Limit Hits/Hour** - Track how often limits are reached
2. **Top Blocked IPs** - Identify potential attackers
3. **Failed Auth Attempts** - Monitor brute-force patterns
4. **Lockout Events** - Count 10+ failure lockouts
5. **Average Response Time** - Track performance impact

---

## Rollback Plan

If issues occur, follow this rollback procedure:

### Quick Rollback (5 minutes)

1. **Disable rate limiting temporarily**:
   ```bash
   # In production .env, set:
   SKIP_RATE_LIMIT_DEV=true
   
   # Restart app
   pm2 restart app
   ```

2. **Or revert code**:
   ```bash
   git revert <commit-hash>
   git push origin main
   # Redeploy
   ```

### Full Rollback (15 minutes)

1. **Restore previous server.js**:
   ```bash
   git checkout HEAD~1 backend/server.js
   git checkout HEAD~1 backend/routes/auth.js
   git checkout HEAD~1 backend/middleware/rateLimiter.js
   ```

2. **Restart services**:
   ```bash
   npm install
   pm2 restart app
   ```

3. **Verify rollback**:
   ```bash
   curl http://your-domain.com/health
   ```

---

## Common Issues & Solutions

### Issue 1: Rate Limiting Too Aggressive

**Symptom**: Legitimate users getting blocked

**Solution**:
```bash
# Increase limits in .env
AUTH_RATE_LIMIT_MAX_REQUESTS=5  # Was 3
AUTH_MODERATE_MAX_REQUESTS=50   # Was 30

# Restart
pm2 restart app
```

### Issue 2: Rate Limiting Not Working

**Symptom**: Able to make unlimited requests

**Solution**:
```bash
# Check these in order:
1. Verify SKIP_RATE_LIMIT_DEV=false in .env
2. Verify app.set('trust proxy', true) in server.js
3. Check if requests are coming from localhost (bypassed in dev mode)
4. Restart the application
```

### Issue 3: Corporate Networks Getting Blocked

**Symptom**: Entire office blocked due to shared IP

**Solution**:
```javascript
// Add IP whitelist in rateLimiter.js
skip: (req) => {
  const ip = req.ip;
  const whitelist = ['1.2.3.4', '5.6.7.8']; // Corporate IPs
  return whitelist.includes(ip);
}
```

### Issue 4: Memory Leak from Tracking

**Symptom**: Memory usage growing over time

**Solution**: The rate limiter automatically cleans up old entries (>1 hour). If issues persist:
```javascript
// In rateLimiter.js, adjust cleanup frequency
// Current: Cleans on each request
// Can add: setInterval(() => { cleanupOldEntries() }, 60000) // Every minute
```

---

## Success Criteria

After deployment, verify these conditions:

- [ ] ✅ API responds to health checks
- [ ] ✅ Authentication endpoints return rate limit headers
- [ ] ✅ Rate limiting triggers after configured attempts
- [ ] ✅ Legitimate users can authenticate successfully
- [ ] ✅ 429 responses include retry information
- [ ] ✅ Logs show rate limiting events
- [ ] ✅ Monitoring alerts are configured
- [ ] ✅ Support team trained on lockout procedures
- [ ] ✅ No increase in error rates (except 429)
- [ ] ✅ Response times within acceptable range

---

## Support Procedures

### For End Users

**If a user reports being locked out:**

1. Check logs for their IP:
   ```bash
   grep "<user-ip>" /var/log/app.log | grep "rate limit"
   ```

2. Verify it's a legitimate lockout (not an attack)

3. Options:
   - Wait for auto-clear (1 hour)
   - Restart server (clears all lockouts)
   - Add IP to whitelist (if corporate network)

4. Communicate clearly:
   ```
   "Your account was temporarily locked due to multiple failed 
   login attempts. This is a security measure. You can try again 
   in XX minutes, or contact support for immediate assistance."
   ```

### For Security Incidents

**If you detect an attack:**

1. Check blocked IPs:
   ```bash
   grep "🚫" /var/log/app.log | tail -50
   ```

2. Verify attack pattern

3. Consider:
   - Reducing rate limits further
   - Adding IP to permanent blocklist
   - Enabling CAPTCHA for affected regions
   - Notifying security team

---

## Timeline Summary

| Phase | Duration | Description |
|-------|----------|-------------|
| **Pre-Deployment** | 15 min | Local testing and verification |
| **Deployment** | 30 min | Code update and configuration |
| **Verification** | 1 hour | Smoke tests and monitoring |
| **Monitoring Setup** | 30 min | Alerts and dashboards |
| **Total** | ~2 hours | Complete deployment |

---

## Contacts

**Deployment Issues**: DevOps Team  
**Security Concerns**: Security Team  
**User Support**: Support Team  
**Code Issues**: Development Team

---

## Checklist

Print and check off during deployment:

```
Pre-Deployment:
[ ] Local tests passed
[ ] Configuration reviewed
[ ] Team notified

Deployment:
[ ] Code pulled/deployed
[ ] .env updated with production values
[ ] SKIP_RATE_LIMIT_DEV=false verified
[ ] Application restarted
[ ] No deployment errors

Verification:
[ ] Health check passes
[ ] Rate limiting works (tested)
[ ] Logs showing rate limit events
[ ] No unexpected errors

Monitoring:
[ ] Alerts configured
[ ] Dashboard updated
[ ] Team monitoring
[ ] Rollback plan ready

Post-Deployment:
[ ] Documentation updated
[ ] Support team trained
[ ] Success metrics tracked
[ ] Incident response ready
```

---

**Good luck with your deployment!** 🚀

If you encounter any issues not covered in this guide, refer to:
- [RATE_LIMITING.md](./RATE_LIMITING.md) - Complete documentation
- [SECURITY_SUMMARY.md](./SECURITY_SUMMARY.md) - Security overview
- [RATE_LIMITING_QUICK_REF.md](./RATE_LIMITING_QUICK_REF.md) - Quick reference

*Last Updated: January 14, 2026*
