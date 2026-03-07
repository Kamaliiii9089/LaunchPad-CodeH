# Password Health Monitor Documentation

## Overview

The Password Health Monitor is a comprehensive security subsystem that detects weak, breached, and reused passwords across the platform — without ever storing or exposing actual password values. It integrates with the HaveIBeenPwned (HIBP) breach database using k-anonymity, performs cross-account reuse detection via one-way hashing, and generates platform-wide health reports for administrators.

## Table of Contents

- [Features](#features)
- [Security Model](#security-model)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
  - [Strength Analysis](#strength-analysis)
  - [Breach Detection (HIBP)](#breach-detection-hibp)
  - [Reuse Detection](#reuse-detection)
  - [Risk Scoring](#risk-scoring)
- [API Endpoints](#api-endpoints)
- [UI Components](#ui-components)
- [Database Schema](#database-schema)
- [Engine Functions](#engine-functions)
- [Integration Guide](#integration-guide)
- [Usage Guide](#usage-guide)
- [Configuration](#configuration)
- [Privacy & Compliance](#privacy--compliance)

---

## Features

### 1. **Password Strength Analysis**
- **Entropy Calculation**: Shannon entropy in bits based on character set size and length
- **Character Class Detection**: Uppercase, lowercase, numbers, special characters
- **Common Pattern Detection**: Keyboard walks (qwerty, asdfgh), sequential numbers, repeated characters
- **Dictionary Check**: Built-in 500+ common/breached password list (password123, admin, etc.)
- **Scoring System**: 0–100 numeric score with 5-tier label (Very Weak → Very Strong)
- **Actionable Feedback**: Per-issue recommendations returned with every check

### 2. **HaveIBeenPwned Breach Detection**
- **k-Anonymity Protocol**: Only the first 5 characters of the SHA-1 hash are ever sent to the HIBP API — the full hash and plaintext never leave the server
- **Real-Time Checking**: Live API call on every password submission
- **Breach Count**: Exact number of times the password appeared in known breach datasets
- **Caching**: `lastBreachCheck` timestamp stored; future checks can use cache for rate-limit management

### 3. **Password Reuse Detection**
- **Cross-Account Comparison**: SHA-256 hashes compared across all platform accounts
- **Zero-Knowledge**: Only derived hashes are stored; the same hash from two accounts means the same password without revealing what it is
- **Reuse Count**: Number of accounts currently sharing the same password
- **Bulk Rescan**: Admin-triggered rescan re-evaluates all reuse flags in one operation

### 4. **Platform Health Report**
- **Risk Distribution**: Account counts by risk level (Critical / High / Medium / Low / None)
- **Strength Distribution**: Breakdown of password strength across all scanned accounts
- **Top Issues**: Most frequently reported security issues ranked by affected account count
- **Critical Accounts List**: Worst-offending accounts (admin view; no passwords shown)
- **Platform Recommendations**: Automated advisory text based on current metrics

### 5. **Admin Scan Control**
- **Reuse Rescan**: Re-evaluates all reuse flags and stale password counters
- **Scan Summary**: Returns counts of records updated, reuse groups found, stale passwords
- **Last Scan Timestamp**: Persisted so operators know when the data was last refreshed

---

## Security Model

The Password Health Monitor is built on the principle that **no actual passwords are ever stored, logged, or transmitted** beyond the immediate in-memory scope of the check function.

| What is stored | What is NOT stored |
|---|---|
| SHA-256 hash of plaintext (reuse index) | The plaintext password |
| SHA-1 prefix (first 5 chars, for HIBP) | The full SHA-1 hash |
| Strength metrics (length, char classes, etc.) | The password itself |
| Risk labels and scores | Any reversible representation |
| Issues and recommendations text | Bcrypt hash |

### HIBP k-Anonymity Flow

```
User submits password "MyPassword123!"
         │
         ▼
Server computes SHA-1: "F5F35DDB8A1BFDB90BF11BA0F68E94DF..."
         │
         ▼
Server sends ONLY first 5 chars to HIBP: GET /range/F5F35
         │
         ▼
HIBP returns ~800 suffix:count pairs (never sees your hash)
         │
         ▼
Server scans response for matching suffix "DDB8A1BF..."
         │
         ▼
Match found → breachCount = N
No match   → isBreached = false
         │
         ▼
Plaintext is discarded. Only { isBreached, breachCount } stored.
```

---

## Architecture

### File Structure

```
lib/
└── passwordHealthEngine.ts        # Core engine (strength, HIBP, reuse, reports)

models/
└── PasswordHealth.ts              # MongoDB schema for derived metrics

app/api/password-health/
├── check/route.ts                 # POST – check own password (authenticated)
├── report/route.ts                # GET  – platform health report (admin)
└── scan/route.ts                  # POST/GET – trigger/query bulk rescan (admin)

components/
└── PasswordHealthMonitor.tsx      # Full dashboard UI (5 sub-tabs)

app/dashboard/
└── page.tsx                       # "Password Health" tab integration
```

### Data Flow

```
1. User opens "My Password" tab in dashboard
   ↓
2. User types password into browser input field
   ↓
3. POST /api/password-health/check  { password: "..." }
   ↓
4. Server: analysePasswordStrength()  →  strength metrics
   Server: checkPasswordBreach()      →  HIBP k-anonymity API
   Server: checkPasswordReuse()       →  MongoDB hash lookup
   Server: calculateOverallRisk()     →  riskScore + riskLabel
   ↓
5. Server upserts PasswordHealth document (no raw password)
   ↓
6. Response: { assessment: { strength, breach, reuse, risk, issues, recommendations } }
   ↓
7. UI renders strength bar, breach badge, reuse badge, recommendations

──────────────────────────────────────────────────

Admin Flow (Platform Report):

1. Admin opens "Risk Report" or "Overview" tab
   ↓
2. GET /api/password-health/report
   ↓
3. Server: generatePlatformHealthReport()
        → aggregates all PasswordHealth documents
        → builds riskDistribution, strengthDistribution, topIssues
   ↓
4. Response: { report, users: { records[], totalCount, ... } }
   ↓
5. Table displays per-account risk levels (no passwords)

──────────────────────────────────────────────────

Admin Rescan Flow:

1. Admin clicks "Run Platform Scan"
   ↓
2. POST /api/password-health/scan
   ↓
3. Server: runBulkReuseRescan()
        → aggregates hash frequency map
        → updates isReused + reuseCount for all records
        → updates daysSincePasswordChange for all users
   ↓
4. Response: { scan: { recordsUpdated, reuseGroupsFound, stalePasswordsFound } }
```

---

## How It Works

### Strength Analysis

The strength analyser runs entirely in-memory and assigns a 0–100 score:

#### Scoring breakdown

| Factor | Points |
|---|---|
| Length < 6 | +0 |
| Length 6–7 | +5 |
| Length 8–9 | +15 |
| Length 10–11 | +25 |
| Length 12–15 | +35 |
| Length 16+ | +45 |
| Has uppercase (A-Z) | +10 |
| Has lowercase (a-z) | +5 |
| Has numbers (0-9) | +10 |
| Has special characters | +15 |
| Entropy ≥ 50 bits | +15 |
| Entropy ≥ 35 bits | +8 |
| Entropy ≥ 20 bits | +3 |
| Keyboard pattern (qwerty, 12345, etc.) | −20 |
| Dictionary / common word | −30 |
| Repeating characters (aaa, 111, etc.) | −10 |

#### Strength labels

| Score range | Label |
|---|---|
| 0–19 | Very Weak |
| 20–39 | Weak |
| 40–59 | Fair |
| 60–79 | Strong |
| 80–100 | Very Strong |

#### Common pattern detection

The engine embeds 500+ common passwords and the following regex patterns:

```
/^qwerty/i      – qwerty keyboard walk
/^asdfgh/i      – asdfgh keyboard walk
/^zxcvbn/i      – zxcvbn keyboard walk
/^12345/        – sequential numbers
/^09876/        – reverse sequential numbers
/^abcde/i       – sequential alphabet
/^aaaaa/i       – repeated character start
/(.)\1{3,}/     – 4+ repeated characters anywhere
```

#### Entropy formula

```
charSetSize = (hasLower ? 26 : 0) + (hasUpper ? 26 : 0)
            + (hasNumbers ? 10 : 0) + (hasSpecial ? 32 : 0)

entropy = log₂(charSetSize ^ passwordLength)   [bits]
```

---

### Breach Detection (HIBP)

The engine uses the [HaveIBeenPwned Passwords API](https://haveibeenpwned.com/API/v3#PwnedPasswords) with the k-anonymity model:

```typescript
// 1. Compute SHA-1 of the password
const fullHash = sha1(password);          // "F5F35DDB8A1BFDB..."

// 2. Prefix = first 5 characters
const prefix = fullHash.slice(0, 5);      // "F5F35"
const suffix = fullHash.slice(5);         // "DDB8A1BFDB..."

// 3. API call — only prefix is sent
GET https://api.pwnedpasswords.com/range/F5F35

// 4. Server returns 500–1000 hash suffixes with breach counts:
// DDB8A1BFDB...:142
// E2A7C1F420...:1
// ...

// 5. Check if our suffix is in the list
if (response includes suffix) → isBreached = true, breachCount = N
```

**The HIBP service never receives**: the full SHA-1 hash, the SHA-256 hash, or the plaintext password.

---

### Reuse Detection

```typescript
// 1. At check time, compute SHA-256 of the plaintext password
const reuseHash = sha256(password);   // stored in PasswordHealth.passwordHashForReuse

// 2. Count other accounts with the same hash
const count = await PasswordHealth.countDocuments({
  passwordHashForReuse: reuseHash,
  userId: { $ne: currentUserId }
});

// 3. isReused = count > 0
//    reuseCount = count + 1 (including current user)
```

**During bulk rescan (no plaintexts available)**:
```typescript
// Group by hash, find groups with more than 1 member
const reuseGroups = await PasswordHealth.aggregate([
  { $group: { _id: '$passwordHashForReuse', count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
]);
// Update isReused and reuseCount for all members of each group
```

---

### Risk Scoring

The overall risk score (0–100) combines all factors:

| Factor | Points added |
|---|---|
| Breached, 1–100 times | +40 |
| Breached, 101–1000 times | +55 |
| Breached, 1000+ times | +70 |
| Strength score < 20 | +50 |
| Strength score 20–39 | +35 |
| Strength score 40–59 | +20 |
| Strength score 60–79 | +5 |
| Password is reused | +30 |
| Dictionary word | +20 |
| Common keyboard pattern | +15 |
| Password > 365 days old | +20 |
| Password 181–365 days old | +10 |
| Password 91–180 days old | +5 |

**Risk labels:**

| Score | Label |
|---|---|
| 75–100 | Critical |
| 55–74 | High |
| 35–54 | Medium |
| 15–34 | Low |
| 0–14 | None |

---

## API Endpoints

### `POST /api/password-health/check`

Check the health of the calling user's own password.

- **Auth Required:** Yes (`Authorization: Bearer <token>`)
- **Body:** `{ password: string }`
- **Max password length:** 1024 characters

**Success Response:**
```json
{
  "success": true,
  "assessment": {
    "strength": {
      "score": 72,
      "label": "strong",
      "length": 14,
      "hasUppercase": true,
      "hasLowercase": true,
      "hasNumbers": true,
      "hasSpecialChars": false,
      "isCommonPattern": false,
      "isDictionaryWord": false,
      "entropy": 83.4
    },
    "breach": {
      "isBreached": false,
      "breachCount": 0,
      "checkedAt": "2026-03-07T12:00:00.000Z",
      "source": "hibp"
    },
    "reuse": {
      "isReused": false,
      "affectedAccounts": 1
    },
    "overallRisk": "low",
    "overallRiskScore": 18,
    "daysSincePasswordChange": 45,
    "issues": [],
    "recommendations": [
      "Add special characters (!@#$%^&*) for extra strength"
    ]
  }
}
```

**Error Responses:**
```json
{ "success": false, "message": "Authentication required" }          // 401
{ "success": false, "message": "A non-empty password string is required" } // 400
{ "success": false, "message": "Password too long (max 1024 characters)" } // 400
```

---

### `GET /api/password-health/report`

Retrieve the platform-wide password health report (admin only).

- **Auth Required:** Yes, admin role
- **Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number for user records |
| `limit` | number | 20 | Records per page (max 100) |
| `risk` | string | — | Filter by risk level: `critical`, `high`, `medium`, `low`, `none` |
| `breached` | boolean | — | `true` to show only breached accounts |
| `reused` | boolean | — | `true` to show only accounts with reused passwords |
| `sort` | string | `risk` | Sort order: `risk`, `strength`, `lastScanned` |

**Success Response:**
```json
{
  "success": true,
  "report": {
    "generatedAt": "2026-03-07T12:00:00.000Z",
    "totalUsersWithPasswords": 150,
    "totalUsersScanned": 87,
    "strengthDistribution": {
      "very_weak": 3,
      "weak": 12,
      "fair": 28,
      "strong": 35,
      "very_strong": 9
    },
    "riskDistribution": {
      "critical": 2,
      "high": 8,
      "medium": 21,
      "low": 34,
      "none": 22
    },
    "breachedAccounts": 5,
    "reusedPasswords": 7,
    "averageStrengthScore": 61,
    "averageRiskScore": 29,
    "stalePaswords": 14,
    "topIssues": [
      { "issue": "No special characters", "affectedAccounts": 44 },
      { "issue": "Password not changed for N days", "affectedAccounts": 14 }
    ],
    "recommendations": [
      "5 account(s) use breached passwords — force a mandatory password reset"
    ],
    "criticalAccounts": [
      {
        "email": "user@example.com",
        "userId": "...",
        "overallRisk": "critical",
        "overallRiskScore": 95,
        "issues": ["Password found in 142 data breach records"],
        "daysSincePasswordChange": 210
      }
    ]
  },
  "users": {
    "page": 1,
    "limit": 20,
    "totalCount": 87,
    "totalPages": 5,
    "records": [ /* UserRecord objects */ ]
  }
}
```

---

### `POST /api/password-health/scan`

Trigger a platform-wide rescan (reuse detection + stale password refresh). Admin only.

- **Auth Required:** Yes, admin role
- **Body:** None required

**Success Response:**
```json
{
  "success": true,
  "scan": {
    "completedAt": "2026-03-07T12:00:00.000Z",
    "durationMs": 843,
    "recordsUpdated": 12,
    "stalePasswordsFound": 14,
    "reuseGroupsFound": 3,
    "totalAccountsScanned": 87,
    "unscannedAccounts": 63
  },
  "stats": {
    "totalScanned": 87,
    "breachedCount": 5,
    "reusedCount": 7,
    "criticalCount": 2,
    "highRiskCount": 8,
    "averageStrengthScore": 61
  },
  "message": "Scan complete. Updated 12 records in 843ms..."
}
```

---

### `GET /api/password-health/scan`

Return current scan statistics without triggering a new scan. Admin only.

**Success Response:**
```json
{
  "success": true,
  "stats": { /* ScanStats */ },
  "lastScanAt": "2026-03-07T11:00:00.000Z"
}
```

---

## UI Components

### `PasswordHealthMonitor.tsx`

The main dashboard component. Accepts a single `toast` prop.

```tsx
<PasswordHealthMonitor toast={toast} />
```

#### Sub-tabs

| Tab | Access | Description |
|---|---|---|
| **Overview** | All users | Platform health score, risk/strength distribution charts, top issues, recommendations |
| **My Password** | All users | Password input field → live HIBP + reuse + strength check |
| **Risk Report** | Admin | Paginated table of all accounts with risk labels, breach/reuse flags, sort/filter |
| **Recommendations** | All users | Actionable security cards based on live platform data |
| **Scan Control** | Admin | Trigger bulk rescan, view last scan timestamp and current stats |

#### Overview Tab Features
- **Platform Health Score** (0–100) displayed as a circular gauge and large number
- **6-card KPI row**: Scanned, Breached, Reused, Critical, High Risk, Avg Score
- **Risk Distribution Bar**: colour-coded horizontal bar chart with legend
- **Strength Distribution**: horizontal bar chart for each strength tier
- **Platform Recommendations**: auto-generated advisory text

#### My Password Tab Features
- Password input with show/hide toggle
- **Live character-class pills** shown while typing (no API call yet) — 8+ chars, Uppercase, Lowercase, Numbers, Special
- Submit triggers full server-side assessment (HIBP + reuse + strength)
- Results display:
  - Overall risk card with colour-coded background
  - Strength bar with score and label
  - 8-point checkmark grid (char classes, length thresholds, pattern checks)
  - Entropy value and days since last password change
  - Breach status card (breach count from HIBP)
  - Reuse status card (number of accounts sharing the hash)
  - Issues list (red)
  - Recommendations list (blue)

#### Risk Report Tab Features
- Filter by: risk level, breached-only, reused-only
- Sort by: highest risk, weakest password, last scanned
- Columns: Account email, Risk badge + score, Strength bar, Breached (with count), Reused (with count), Password age, Last scan date
- Pagination (25 records per page)
- No password values in any column

---

## Database Schema

### `PasswordHealth` Model (`models/PasswordHealth.ts`)

```typescript
{
  // Identity
  userId:              String,           // References User._id (unique index)
  email:               String,           // Lowercase, indexed

  // Strength metrics
  strength:            'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong',
  strengthScore:       Number,           // 0–100
  passwordLength:      Number,
  hasUppercase:        Boolean,
  hasLowercase:        Boolean,
  hasNumbers:          Boolean,
  hasSpecialChars:     Boolean,
  isCommonPattern:     Boolean,
  isDictionaryWord:    Boolean,

  // Breach detection
  isBreached:          Boolean | null,   // null = not yet checked
  breachCount:         Number,
  lastBreachCheck:     Date,
  hibpPrefix:          String,           // SHA-1 first 5 chars (5 hex chars)

  // Reuse detection
  passwordHashForReuse: String,          // SHA-256 of plaintext (indexed)
  isReused:            Boolean,
  reuseCount:          Number,

  // Risk summary
  overallRisk:         'critical' | 'high' | 'medium' | 'low' | 'none',
  overallRiskScore:    Number,           // 0–100
  issues:              String[],
  recommendations:     String[],

  // Timestamps
  lastScannedAt:       Date,
  daysSincePasswordChange: Number | null,
}
```

**Indexes:**
- `userId` — unique
- `email` — regular
- `overallRisk` — regular
- `isBreached` — regular
- `isReused` — regular
- `passwordHashForReuse` — regular (enables fast reuse lookup)
- `{ overallRisk: 1, updatedAt: -1 }` — compound (dashboard queries)

---

## Engine Functions

### `lib/passwordHealthEngine.ts`

| Function | Signature | Description |
|---|---|---|
| `analysePasswordStrength` | `(password: string) → StrengthResult` | Full strength analysis (sync) |
| `checkPasswordBreach` | `(password: string) → Promise<BreachResult>` | HIBP k-anonymity check |
| `checkPasswordReuse` | `(hash: string, excludeUserId?: string) → Promise<{isReused, reuseCount}>` | Cross-account hash comparison |
| `calculateOverallRisk` | `(strengthScore, isBreached, isReused, ...) → {risk, riskScore}` | Combined risk calculation (sync) |
| `assessPasswordHealth` | `(userId, email, password, checkBreachOnline?) → Promise<Assessment>` | Full assessment + DB upsert |
| `runBulkReuseRescan` | `() → Promise<number>` | Platform-wide reuse flag refresh |
| `generatePlatformHealthReport` | `() → Promise<PlatformHealthReport>` | Full platform report from DB |
| `getUserPasswordHealth` | `(userId: string) → Promise<IPasswordHealthRecord \| null>` | Fetch a user's stored health record |
| `getPasswordHealthStats` | `() → Promise<ScanStats>` | Quick aggregate stats |
| `sha256` | `(password: string) → string` | SHA-256 uppercase hex |
| `hibpPrefix` | `(password: string) → string` | SHA-1 first 5 chars |
| `calculateEntropy` | `(password: string) → number` | Shannon entropy in bits |

---

## Integration Guide

### Hooking into the password change flow

To automatically record health metrics when a user changes their password, call `assessPasswordHealth` in the password change API route:

```typescript
import { assessPasswordHealth } from '@/lib/passwordHealthEngine';

// In your password change handler (after bcrypt hash, before saving)
await assessPasswordHealth(
  userId,
  userEmail,
  newPlaintextPassword,  // ephemeral — discarded after this call
  true,                  // checkBreachOnline
);
```

> **Important**: Call this with the plaintext password **before** it is replaced in memory by the bcrypt hash. The function will hash it internally and discard the plaintext.

### Hooking into the registration flow

```typescript
// In POST /api/auth/register, after user is created:
await assessPasswordHealth(userId, email, password, true);
```

### Checking health without an API call (server-side only)

```typescript
import { analysePasswordStrength, checkPasswordBreach } from '@/lib/passwordHealthEngine';

const strength = analysePasswordStrength(password);
const breach   = await checkPasswordBreach(password);
```

---

## Usage Guide

### For End Users

1. Navigate to **Dashboard → Password Health**
2. Click the **My Password** tab
3. Type your current password in the input field
4. A live preview shows which character requirements are met
5. Click **Analyse** to run the full check
6. Review:
   - **Strength bar** — how complex your password is
   - **Breach status** — whether your password has appeared in data breaches
   - **Reuse status** — whether other platform accounts share the same password
   - **Issues** — specific problems found
   - **Recommendations** — what to do to improve security
7. If your risk is Critical or High, change your password immediately

### For Administrators

#### Viewing Platform Health
1. Navigate to **Dashboard → Password Health → Overview**
2. The platform health score (0–100) shows the aggregate risk level
3. Risk and strength distribution charts show the breakdown
4. Platform recommendations highlight the most urgent actions

#### Reviewing High-Risk Accounts
1. Go to **Risk Report** tab
2. Filter by "Critical" or "High" risk
3. Enable "Breached only" to focus on compromised accounts
4. Use the table to identify affected users and their issues
5. Take action (e.g. force password reset via your user management tools)

#### Running a Rescan
1. Go to **Scan Control** tab (or click **Run Platform Scan** on the Overview)
2. Click **Run Full Scan**
3. The scan updates:
   - Reuse detection flags for all accounts
   - `daysSincePasswordChange` counters
4. Review the scan summary for records updated and groups found

> **Note**: HIBP checks require the user's plaintext password at submission time. Bulk HIBP checks are not possible since passwords are stored as one-way bcrypt hashes. Encourage users to submit their password via the **My Password** tab.

---

## Configuration

The Password Health Monitor does not have a runtime configuration document. The following constants in `lib/passwordHealthEngine.ts` can be adjusted:

| Constant | Default | Description |
|---|---|---|
| `COMMON_PASSWORDS` | 500+ entries | Set of passwords that trigger the dictionary check |
| `KEYBOARD_PATTERNS` | 8 patterns | Regex patterns for common keyboard walks |
| Breach API timeout | 6 000 ms | `AbortController` timeout for HIBP fetch |
| Risk thresholds | 75/55/35/15 | Score boundaries for Critical/High/Medium/Low |
| Strength tier boundaries | 80/60/40/20 | Score boundaries for strength labels |

---

## Privacy & Compliance

### What data is stored

The `PasswordHealth` collection contains **only derived, non-reversible data**:

- SHA-256 hash of the plaintext password (reuse detection index)
- First 5 characters of SHA-1 (HIBP prefix — not the full hash)
- Structural metrics: length, character class booleans, entropy
- Risk labels and scores
- Issues and recommendations text (generic phrases, not password contents)

### What data is never stored

- ✗ The plaintext password
- ✗ The full SHA-1 hash
- ✗ The bcrypt hash from the User model
- ✗ Any value that could be used to reconstruct the password

### Regulatory notes

- **GDPR / CCPA**: No personal credentials are stored; only irreversible hashes and aggregate metrics.
- **HIPAA**: The system does not store any PHI; health status refers to password security, not medical data.
- **HIBP API**: The k-anonymity model ensures no password data ever reaches HaveIBeenPwned servers. See [HIBP k-anonymity model](https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange).
- **SOC 2 / ISO 27001**: Breach and reuse monitoring supports password-security controls typically required by these frameworks.

### SHA-256 hash reversibility

SHA-256 is a one-way cryptographic function. Given a stored hash, there is no known efficient algorithm to recover the original input. However, a pre-image attack using a dictionary of common passwords is theoretically possible if the hash is leaked. The system mitigates this by:

1. Never exposing the `passwordHashForReuse` field in any API response
2. Storing the hash only for reuse comparison — not in logs, audit trails, or exports
3. Using the full SHA-256 (256 bits) which is computationally infeasible to brute-force

---

## Related Documentation

- [2FA_DOCUMENTATION.md](./2FA_DOCUMENTATION.md) — Two-Factor Authentication
- [DEVICE_SECURITY_DOCUMENTATION.md](./DEVICE_SECURITY_DOCUMENTATION.md) — Device fingerprinting & trusted devices
- [SECURITY_FEATURES_SUMMARY.md](./SECURITY_FEATURES_SUMMARY.md) — Full security feature overview
- [DATA_PRIVACY_DOCUMENTATION.md](./DATA_PRIVACY_DOCUMENTATION.md) — Data privacy policies
- [INCIDENT_RESPONSE_DOCUMENTATION.md](./INCIDENT_RESPONSE_DOCUMENTATION.md) — How to respond to a breach event
