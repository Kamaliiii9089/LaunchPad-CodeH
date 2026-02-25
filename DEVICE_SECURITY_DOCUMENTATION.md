# Device Security & Browser Protection Documentation

## Overview

The Device Security system provides comprehensive protection through device fingerprinting, browser security monitoring, suspicious device detection, and trusted device management. This multi-layered security approach enhances account protection beyond traditional authentication methods.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Device Fingerprinting](#device-fingerprinting)
- [Browser Security Checks](#browser-security-checks)
- [Trusted Device Management](#trusted-device-management)
- [API Endpoints](#api-endpoints)
- [Usage Guide](#usage-guide)
- [Security Scoring](#security-scoring)
- [Integration](#integration)

---

## Features

### 1. **Device Fingerprinting**
- **Unique Device Identification**: Generates unique identifiers based on device characteristics
- **Multi-Factor Detection**: Combines browser, OS, screen resolution, timezone, and features
- **Non-Invasive**: Works without cookies or local storage
- **Privacy-Focused**: Data processed securely and stored encrypted

### 2. **Browser Security Checks**
- **Real-time Monitoring**: Continuous security assessment of browser environment
- **HTTPS Verification**: Ensures secure connection protocols
- **Feature Detection**: Validates browser capabilities (WebGL, Canvas, WebRTC)
- **Vulnerability Scanning**: Detects outdated browsers and security risks
- **Security Scoring**: 0-100 score based on multiple security factors

### 3. **Suspicious Device Detection**
- **Headless Browser Detection**: Identifies PhantomJS, HeadlessChrome
- **Automation Tool Detection**: Detects Selenium, Puppeteer, Playwright
- **Bot Detection**: Identifies automated access attempts
- **VPN/Proxy Detection**: Flags timezone/language mismatches
- **Tor Browser Detection**: Identifies Tor network usage
- **Anomaly Detection**: Unusual screen resolutions, missing features

### 4. **Trusted Device Management**
- **Device Tracking**: Maintains history of all devices used for login
- **Trust Score System**: Dynamic scoring based on usage patterns
- **Manual Trust Control**: Users can trust/remove devices
- **2FA Integration**: Require 2FA for device trust operations
- **Session Management**: Track active sessions per device
- **Geographic Tracking**: Monitor device locations (IP-based)

---

## Architecture

### File Structure

```
lib/
├── deviceFingerprint.ts    # Server-side fingerprint processing
└── deviceSecurity.ts       # Client-side security utilities

app/api/
├── devices/
│   ├── route.ts           # GET (list), DELETE (remove)
│   ├── verify/route.ts    # POST (verify current device)
│   └── trust/route.ts     # POST (trust device with 2FA)
└── auth/login/route.ts    # Enhanced with device validation

models/
└── User.ts                # Extended with device fields

app/dashboard/
└── page.tsx               # UI for device management
```

### Data Flow

```
1. User Login
   ↓
2. Client generates fingerprint (deviceSecurity.ts)
   ↓
3. Sent to /api/auth/login with credentials
   ↓
4. Server processes fingerprint (deviceFingerprint.ts)
   ↓
5. Device verified/added to user.trustedDevices
   ↓
6. Trust score calculated
   ↓
7. Security flags checked
   ↓
8. Response with device status
   ↓
9. Dashboard displays device info
```

---

## Device Fingerprinting

### How It Works

The system collects non-invasive browser and device information to create a unique identifier:

#### Client-Side Collection
```typescript
interface DeviceFingerprint {
  userAgent: string;
  browser: { name, version, engine };
  os: { name, version };
  device: { type, vendor, model };
  screen: { width, height, colorDepth, pixelRatio };
  timezone: string;
  language: string;
  platform: string;
  cookiesEnabled: boolean;
  doNotTrack: boolean;
  browserFeatures: {
    webGL, canvas, webRTC,
    localStorage, sessionStorage, indexedDB
  };
}
```

#### Server-Side Processing
```typescript
// Generate unique device ID
const deviceId = SHA256(
  userAgent + platform + screen + timezone + language
);

// Calculate security score
const securityScore = analyzeDeviceSecurity(fingerprint);

// Detect suspicious patterns
const suspiciousFlags = detectAnomalies(fingerprint);
```

### Device ID Generation

The device ID is a SHA-256 hash of:
- User Agent string
- Platform
- Screen dimensions (width, height, color depth)
- Timezone
- Browser language

This creates a stable identifier that persists across sessions while respecting user privacy.

---

## Browser Security Checks

### Security Scoring System

**Score Range**: 0-100

#### Scoring Factors

| Check | Impact | Points Deducted |
|-------|--------|-----------------|
| Not using HTTPS | Critical | -30 |
| Cookies disabled | Medium | -10 |
| LocalStorage unavailable | Medium | -10 |
| Mixed content detected | High | -15 |
| Outdated browser | High | -20 |
| Developer tools open | Low | -5 |

### Score Interpretation

- **80-100**: ✅ Excellent - Full trust
- **60-79**: ⚠️ Good - Minor warnings
- **40-59**: ⚠️ Fair - Requires attention
- **0-39**: 🚫 Poor - High risk

### Real-time Monitoring

```typescript
const securityCheck = performBrowserSecurityCheck();
// Returns: { isSecure, warnings[], score }

// Example warnings:
// - "Not using HTTPS"
// - "Cookies are disabled"
// - "Browser may be outdated"
// - "Mixed content detected"
```

---

## Trusted Device Management

### Device Lifecycle

#### 1. First Login (New Device)
```
Device detected → Fingerprint generated → Added to trustedDevices
  ↓
Initial trust score: 50/100
Status: Unverified
Requires: Additional verification for sensitive operations
```

#### 2. Subsequent Logins (Existing Device)
```
Device recognized → Trust score updated → Login allowed
  ↓
Trust score increases based on:
- Device age (days since first seen)
- Usage frequency (login count)
- Recent activity (days since last used)
- Clean record (no failed attempts)
```

#### 3. Trust Score Calculation

```typescript
calculateTrustScore({
  firstSeen: Date,
  lastUsed: Date,
  loginCount: number,
  failedAttempts: number,
  securityScore: number
}): number

// Factors:
// + Device age (older = more trusted)
// + Recent activity (recently used = more trusted)
// + Login history (more logins = more trusted)
// - Failed attempts (penalty)
// + Security score (browser security factor)
```

#### Trust Score Breakdown
- **Base Score**: 50
- **Device Age Bonus**: +5 to +20 (1d → 90d+)
- **Recent Activity**: +10 (today), -10 (90d+ inactive)
- **Login Count**: +5 to +15 (5 → 50+ logins)
- **Failed Attempts**: -5 to -20 (1 → 5+ failures)
- **Security Score**: ±15 (based on browser security)

### Auto-Trust Criteria

A device is automatically trusted when:
1. Security score ≥ 80 AND no suspicious flags AND trust score ≥ 70
2. OR security score ≥ 60 AND trust score ≥ 85

### Device Information Tracked

```typescript
interface TrustedDevice {
  deviceId: string;              // Unique identifier
  deviceName: string;            // "Chrome on Windows"
  deviceType: string;            // desktop | mobile | tablet
  browser: string;               // "Chrome 120.0"
  os: string;                    // "Windows 10/11"
  lastUsed: Date;               // Last login timestamp
  firstSeen: Date;              // First login timestamp
  trustScore: number;           // 0-100
  isTrusted: boolean;           // Manual trust flag
  trustedAt?: Date;             // When manually trusted
  ip?: string;                  // Last known IP
  location?: string;            // City/Country
  securityScore: number;        // Browser security score
  suspiciousFlags: string[];    // Security warnings
  loginCount: number;           // Total logins
  failedAttempts: number;       // Failed login count
}
```

---

## API Endpoints

### 1. List Trusted Devices

**Endpoint**: `GET /api/devices`

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "devices": [
    {
      "deviceId": "abc123...",
      "deviceName": "Chrome on Windows",
      "deviceType": "desktop",
      "browser": "Chrome 120.0",
      "os": "Windows 10/11",
      "lastUsed": "2026-02-25T10:30:00Z",
      "firstSeen": "2026-01-15T09:00:00Z",
      "trustScore": 85,
      "isTrusted": true,
      "ip": "192.168.1.100",
      "location": "New York, US",
      "securityScore": 95,
      "loginCount": 42
    }
  ]
}
```

### 2. Verify Current Device

**Endpoint**: `POST /api/devices/verify`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "clientFingerprint": {
    "userAgent": "Mozilla/5.0...",
    "browser": { "name": "Chrome", "version": "120.0" },
    "os": { "name": "Windows", "version": "10/11" },
    "screen": { "width": 1920, "height": 1080 },
    "timezone": "America/New_York",
    "language": "en-US",
    "browserFeatures": { ... }
  }
}
```

**Response**:
```json
{
  "success": true,
  "device": {
    "deviceId": "abc123...",
    "deviceName": "Chrome on Windows",
    "isNewDevice": false,
    "isTrusted": true,
    "trustScore": 85,
    "securityScore": 95,
    "suspiciousFlags": [],
    "requiresVerification": false
  }
}
```

### 3. Trust Device (Requires 2FA)

**Endpoint**: `POST /api/devices/trust`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "deviceId": "abc123...",
  "code": "123456"  // 2FA code (if enabled)
}
```

**Response**:
```json
{
  "success": true,
  "message": "Device marked as trusted",
  "device": {
    "deviceId": "abc123...",
    "deviceName": "Chrome on Windows",
    "isTrusted": true,
    "trustedAt": "2026-02-25T10:30:00Z"
  }
}
```

### 4. Remove Device

**Endpoint**: `DELETE /api/devices`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "deviceId": "abc123..."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Device removed successfully"
}
```

---

## Usage Guide

### For Developers

#### 1. Client-Side Integration

```typescript
import { generateDeviceFingerprint } from '@/lib/deviceSecurity';

// On login page
const handleLogin = async () => {
  const fingerprint = generateDeviceFingerprint();
  
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      deviceFingerprint: fingerprint
    })
  });
  
  const data = await response.json();
  
  if (data.deviceInfo?.isNewDevice) {
    console.log('New device detected!');
  }
};
```

#### 2. Dashboard Integration

```typescript
import { 
  getTrustedDevices, 
  removeDevice, 
  verifyCurrentDevice,
  performBrowserSecurityCheck 
} from '@/lib/deviceSecurity';

// Load devices on dashboard
useEffect(() => {
  const loadDevices = async () => {
    const result = await getTrustedDevices(token);
    if (result.success) {
      setDevices(result.devices);
    }
  };
  
  loadDevices();
}, []);

// Verify current device
const checkDevice = async () => {
  const result = await verifyCurrentDevice(token);
  if (result.device?.suspiciousFlags.length > 0) {
    alert('Security warning!');
  }
};

// Browser security check
const securityCheck = performBrowserSecurityCheck();
console.log('Security Score:', securityCheck.score);
console.log('Warnings:', securityCheck.warnings);
```

#### 3. Custom Security Policies

```typescript
// In your API routes
import { requiresAdditionalVerification } from '@/lib/deviceFingerprint';

if (requiresAdditionalVerification(fingerprint)) {
  // Require additional authentication
  return Response.json({
    success: false,
    error: 'Additional verification required',
    requiresVerification: true
  }, { status: 403 });
}
```

### For End Users

#### Dashboard Features

1. **View Security Score**
   - Navigate to Settings tab
   - Check "Browser Security" section
   - View circular progress indicator with current score
   - Review any security warnings

2. **View Trusted Devices**
   - Navigate to Settings tab
   - Scroll to "Trusted Devices" section
   - See all devices that have accessed your account
   - View device details: browser, OS, trust score, last used

3. **Remove a Device**
   - Click "Remove" button on any device
   - Confirm the action
   - Device will be removed and require re-verification on next login

4. **Current Device Info**
   - See your current device information
   - Check trust score and security status
   - View any suspicious activity flags

---

## Security Scoring

### Suspicious Flags Reference

| Flag | Severity | Description | Action |
|------|----------|-------------|--------|
| `HEADLESS_BROWSER` | Critical | PhantomJS, HeadlessChrome detected | Block/Require 2FA |
| `AUTOMATION_TOOL` | Critical | Selenium, Puppeteer detected | Block/Require 2FA |
| `SUSPICIOUS_USER_AGENT` | High | Bot-like user agent | Additional verification |
| `OUTDATED_BROWSER` | Medium | Browser below minimum version | Warning |
| `COOKIES_DISABLED` | Low | Cookies not enabled | Warning |
| `MISSING_STORAGE_FEATURES` | Medium | LocalStorage unavailable | Potential spoofing |
| `UNUSUAL_SCREEN_RESOLUTION` | Low | Uncommon screen size | Minor flag |
| `TOR_BROWSER` | High | Tor network detected | Additional verification |
| `TIMEZONE_LANGUAGE_MISMATCH` | Medium | Geographic inconsistency | VPN/Proxy suspected |

### Security Score Impact

```
Final Security Score = Base Score (100)
  - Headless Browser (-30)
  - Automation Tool (-40)
  - Suspicious UA (-20)
  - Outdated Browser (-15)
  - Cookies Disabled (-10)
  - Missing Features (-15)
  - Unusual Resolution (-5)
  - Tor Browser (-25)
  - Timezone Mismatch (-10)
```

---

## Integration

### Prerequisites

1. **MongoDB** - For storing device information
2. **JWT** - For API authentication
3. **Next.js 13+** - App router
4. **TypeScript** - Type safety

### Environment Variables

```env
JWT_SECRET=your-secret-key-here
MONGODB_URI=mongodb://...
```

### Database Schema

The User model is extended with:
```typescript
{
  trustedDevices: [{
    deviceId: String,
    deviceName: String,
    deviceType: String,
    browser: String,
    os: String,
    lastUsed: Date,
    firstSeen: Date,
    trustScore: Number,
    isTrusted: Boolean,
    trustedAt: Date,
    ip: String,
    location: String,
    securityScore: Number,
    suspiciousFlags: [String],
    loginCount: Number,
    failedAttempts: Number
  }],
  activeSessions: [{
    sessionId: String,
    deviceId: String,
    createdAt: Date,
    expiresAt: Date,
    ip: String,
    lastActivity: Date
  }]
}
```

### Installation Steps

1. **Install dependencies** (if any new packages needed):
   ```bash
   npm install crypto
   ```

2. **Copy files**:
   - `lib/deviceFingerprint.ts`
   - `lib/deviceSecurity.ts`
   - `app/api/devices/route.ts`
   - `app/api/devices/verify/route.ts`
   - `app/api/devices/trust/route.ts`

3. **Update User model**:
   - Add device-related fields (see code above)

4. **Update login flow**:
   - Modify `/api/auth/login/route.ts` to include device validation

5. **Update dashboard**:
   - Add device management UI to dashboard

6. **Test thoroughly**:
   - Test device detection
   - Test trust score calculation
   - Test device removal
   - Test security scoring

---

## Best Practices

### Security Recommendations

1. **Always use HTTPS** in production
2. **Implement rate limiting** on device API endpoints
3. **Log device security events** for audit trails
4. **Alert users** of new device logins via email
5. **Require 2FA** for trusting devices
6. **Regularly review** suspicious devices
7. **Set device limits** per user (e.g., max 10 devices)
8. **Auto-remove** inactive devices after 90 days

### Privacy Considerations

1. **Anonymize IP addresses** after 30 days
2. **Allow users** to delete device history
3. **Clear disclosure** about data collection
4. **GDPR compliance** for EU users
5. **Data retention policy** documented

### Performance Optimization

1. **Cache device fingerprints** on client-side (session)
2. **Index deviceId** in MongoDB
3. **Lazy load** device list (pagination)
4. **Debounce** security checks
5. **Background jobs** for trust score updates

---

## Troubleshooting

### Common Issues

#### 1. Device Not Recognized
**Problem**: Same device getting treated as new
**Solution**: Check if browser data is being cleared, check fingerprint consistency

#### 2. Low Security Score
**Problem**: Good browser showing low score
**Solution**: Review security checks, ensure HTTPS, enable cookies

#### 3. False Positives
**Problem**: Legitimate users flagged as suspicious
**Solution**: Adjust threshold values, review flag logic

#### 4. Trust Score Not Updating
**Problem**: Score remains static
**Solution**: Check trust calculation function, verify login count updates

---

## FAQ

**Q: How unique is the device fingerprint?**
A: Typically 1 in 10,000+ devices, varies based on browser diversity

**Q: Can users bypass device detection?**
A: Sophisticated users can, but it requires significant effort and still leaves traces

**Q: Does this work in incognito mode?**
A: Yes, but the fingerprint may differ from normal mode

**Q: How often should trust scores be recalculated?**
A: On every login, automatically updated

**Q: What happens if a device is removed?**
A: User must re-verify on next login, but can still access account

**Q: Is this GDPR compliant?**
A: Yes, with proper disclosure and data retention policies

**Q: Can this prevent account takeover?**
A: It significantly reduces risk but should be combined with 2FA

---

## Support & Resources

### Documentation Links
- [2FA Documentation](./2FA_DOCUMENTATION.md)
- [Form Validation Documentation](./FORM_VALIDATION_DOCUMENTATION.md)
- [API Testing Guide](./API_TESTING.md)

### Code References
- Device Fingerprinting: `lib/deviceFingerprint.ts`
- Client Security: `lib/deviceSecurity.ts`
- API Routes: `app/api/devices/`
- Dashboard UI: `app/dashboard/page.tsx`

### Further Reading
- [Browser Fingerprinting Techniques](https://en.wikipedia.org/wiki/Device_fingerprint)
- [OWASP Device Fingerprinting](https://owasp.org/www-community/controls/Device_Fingerprinting)
- [NIST Account Recovery Guidelines](https://pages.nist.gov/800-63-3/)

---

## Changelog

### Version 1.0.0 (February 2026)
- ✅ Initial release
- ✅ Device fingerprinting system
- ✅ Browser security checks
- ✅ Trust score calculation
- ✅ Trusted device management UI
- ✅ API endpoints for device operations
- ✅ Login integration
- ✅ Dashboard integration
- ✅ Suspicious device detection
- ✅ Real-time security monitoring

---

## License

This feature is part of the BreachBuddy security platform.

---

**Last Updated**: February 25, 2026
**Version**: 1.0.0
**Status**: Production Ready ✅
