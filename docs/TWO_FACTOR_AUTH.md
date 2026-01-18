# Two-Factor Authentication (2FA)

## Overview

LaunchPad implements industry-standard Two-Factor Authentication (2FA) using Time-based One-Time Passwords (TOTP). This adds an extra layer of security to user accounts by requiring both:
1. Something you know (password)
2. Something you have (authenticator app on your phone)

## Features

✅ **TOTP-based Authentication** - Compatible with Google Authenticator, Authy, Microsoft Authenticator, and other TOTP apps
✅ **QR Code Setup** - Easy setup by scanning a QR code
✅ **Recovery Codes** - 10 backup codes for account recovery if device is lost
✅ **Recovery Code Regeneration** - Generate new recovery codes anytime
✅ **Secure Storage** - 2FA secrets and recovery codes are hashed and stored securely
✅ **Flexible Login** - Use either authenticator code or recovery code
✅ **Account Protection** - Prevent unauthorized access even if password is compromised

---

## User Guide

### Setting Up 2FA

1. **Navigate to Settings**
   - Go to Settings → Two-Factor Authentication section

2. **Initiate Setup**
   - Click the "Setup 2FA" button
   - A QR code and secret key will be generated

3. **Scan QR Code**
   - Open your authenticator app (Google Authenticator, Authy, etc.)
   - Scan the displayed QR code
   - Alternatively, manually enter the secret key shown

4. **Verify Setup**
   - Enter the 6-digit code from your authenticator app
   - Click "Verify & Enable"

5. **Save Recovery Codes**
   - **IMPORTANT**: A modal will display 10 recovery codes
   - Download or write down these codes
   - Store them in a safe place
   - Each code can only be used once

### Logging In with 2FA

1. **Enter Credentials**
   - Enter your email and password as usual

2. **Enter 2FA Code**
   - You'll be redirected to the 2FA verification page
   - Open your authenticator app
   - Enter the current 6-digit code
   - Click "Verify"

3. **Alternative: Use Recovery Code**
   - If you lost your authenticator device, click "Lost your device? Use recovery code"
   - Enter one of your 8-character recovery codes
   - Each recovery code can only be used once

### Managing Recovery Codes

#### Viewing Recovery Code Status
- Go to Settings → Two-Factor Authentication
- If 2FA is enabled, you'll see the "Recovery Codes" section
- It displays how many recovery codes you have remaining (out of 10)

#### Regenerating Recovery Codes
1. In the Recovery Codes section, click "Regenerate Recovery Codes"
2. Enter your current authenticator code to confirm
3. New recovery codes will be generated
4. **IMPORTANT**: Old codes will be invalidated
5. Download and save the new codes

### Disabling 2FA

1. Go to Settings → Two-Factor Authentication
2. Click "Disable 2FA"
3. Enter your current authenticator code to confirm
4. 2FA will be disabled and all recovery codes will be removed

---

## Technical Implementation

### Backend Architecture

#### Database Schema
```javascript
// User Model
{
  twoFactorSecret: {
    type: Object,        // Stores TOTP secret (base32, otpauth_url, etc.)
    select: false        // Hidden by default for security
  },
  is2FAEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorRecoveryCodes: {
    type: [String],      // Array of bcrypt-hashed recovery codes
    select: false        // Hidden by default
  }
}
```

#### API Endpoints

**POST /api/auth/2fa/setup**
- Generate 2FA secret and QR code
- Requires: Authentication
- Returns: `{ secret, otpauth_url, qrCode }`

**POST /api/auth/2fa/verify**
- Verify TOTP code and enable 2FA
- Requires: Authentication, `{ token }`
- Returns: `{ message, is2FAEnabled, recoveryCodes }`
- Generates 10 recovery codes on first enable

**POST /api/auth/2fa/disable**
- Disable 2FA and clear secrets
- Requires: Authentication, `{ token }`
- Returns: `{ message }`
- Removes secret and all recovery codes

**POST /api/auth/2fa/validate**
- Validate 2FA during login
- Requires: `{ tempToken, token, isRecoveryCode }`
- Returns: `{ token, user }`
- Supports both authenticator codes and recovery codes
- Removes used recovery code from database

**POST /api/auth/2fa/regenerate-recovery-codes**
- Generate new recovery codes
- Requires: Authentication, `{ token }`
- Returns: `{ message, recoveryCodes }`

**GET /api/auth/2fa/recovery-codes-status**
- Get count of remaining recovery codes
- Requires: Authentication
- Returns: `{ remainingCodes, hasRecoveryCodes }`

### Security Measures

#### 1. Secret Storage
- TOTP secrets stored as objects with base32 encoding
- Excluded from query results by default (`select: false`)

#### 2. Recovery Code Hashing
```javascript
// Recovery codes are hashed before storage
const hashRecoveryCodes = async (codes) => {
  const hashedCodes = [];
  for (const code of codes) {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(code, salt);
    hashedCodes.push(hashed);
  }
  return hashedCodes;
};
```

#### 3. Temporary Session Tokens
- After password verification, server issues temporary JWT with `scope: '2fa_pending'`
- Valid for only 5 minutes
- Cannot be used to access protected resources
- Must complete 2FA validation to get full access token

#### 4. Recovery Code Consumption
- Each recovery code is single-use
- After successful validation, code is removed from database
- Prevents code reuse attacks

#### 5. Rate Limiting
- 2FA endpoints protected by authentication middleware
- Login attempts tracked and limited by `rateLimiter` middleware

### Frontend Components

#### 1. SettingsPage - 2FA Management
- Setup interface with QR code display
- Enable/disable 2FA controls
- Recovery codes display modal
- Recovery codes regeneration
- Status indicators

#### 2. TwoFactorPage - Login Verification
- 6-digit authenticator code input
- 8-character recovery code input
- Toggle between authenticator and recovery modes
- Session timeout handling

#### 3. AuthContext Integration
- Handles 2FA flow in login process
- Stores and manages temporary tokens
- Updates user state after 2FA verification

---

## Security Best Practices

### For Users

1. **Keep Recovery Codes Safe**
   - Store recovery codes in a secure password manager
   - Keep a physical copy in a safe location
   - Never share recovery codes with anyone

2. **Use Multiple Devices**
   - Consider setting up the same TOTP secret on multiple devices
   - Ensures backup access if one device is lost

3. **Regenerate Regularly**
   - Regenerate recovery codes if you suspect they've been compromised
   - Update codes after using several of them

4. **Secure Your Authenticator App**
   - Use device lock (PIN, biometric)
   - Enable app-level security if available
   - Keep authenticator app backups if supported

### For Developers

1. **Never Log Secrets**
   - TOTP secrets and recovery codes should never appear in logs
   - Use `select: false` for sensitive fields

2. **Validate User Intent**
   - Always require current authenticator code before critical operations
   - Disable, regenerate, and other sensitive actions need verification

3. **Secure Token Handling**
   - Use short-lived temporary tokens for 2FA flow
   - Include scope claims to limit token usage
   - Verify token scope before granting access

4. **Hash Recovery Codes**
   - Never store plain-text recovery codes
   - Use strong hashing (bcrypt with salt)
   - Remove codes after use

---

## Troubleshooting

### "Invalid authentication code" Error

**Possible Causes:**
- Time sync issue between server and device
- Code expired (codes change every 30 seconds)
- Wrong secret scanned during setup

**Solutions:**
1. Ensure device clock is accurate
2. Wait for a new code to generate
3. Try entering the code immediately after it changes
4. Re-setup 2FA if problem persists

### Lost Authenticator Device

**Solution:**
1. Click "Lost your device? Use recovery code" on 2FA page
2. Enter one of your saved recovery codes
3. After logging in, go to Settings and set up 2FA again
4. Save the new recovery codes

### Lost Recovery Codes

**If you can still log in:**
1. Go to Settings → Two-Factor Authentication
2. Click "Regenerate Recovery Codes"
3. Enter current authenticator code
4. Download and save new codes

**If you cannot log in:**
- Contact support for account recovery
- Account owner verification will be required

### Time Synchronization Issues

TOTP requires accurate time on both server and client:
- Server: Ensure NTP is configured and running
- Client: Enable automatic date/time on mobile device
- Acceptable time drift: Usually ±30 seconds

---

## Migration from Non-2FA Accounts

Existing users can enable 2FA at any time:
1. No disruption to existing sessions
2. 2FA required on next login after enabling
3. Optional feature - users can choose to enable or not

---

## Future Enhancements

Planned improvements:
- [ ] SMS-based 2FA option
- [ ] Email-based 2FA option
- [ ] Backup email for recovery
- [ ] WebAuthn/FIDO2 support
- [ ] Remember device option (30 days)
- [ ] Security notifications for 2FA changes
- [ ] Admin dashboard for 2FA statistics

---

## Testing

### Manual Testing Checklist

**Setup Flow:**
- [ ] QR code displays correctly
- [ ] Manual secret entry works
- [ ] Invalid code shows error
- [ ] Valid code enables 2FA
- [ ] Recovery codes displayed after enable
- [ ] Can download recovery codes

**Login Flow:**
- [ ] Redirected to 2FA page after password
- [ ] Valid authenticator code allows login
- [ ] Invalid code shows error
- [ ] Recovery code allows login
- [ ] Used recovery code removed
- [ ] Session timeout works

**Management:**
- [ ] Can view recovery code status
- [ ] Can regenerate recovery codes
- [ ] Old codes invalidated after regeneration
- [ ] Can disable 2FA with valid code
- [ ] All secrets removed after disable

**Edge Cases:**
- [ ] Expired temp token handled
- [ ] Missing temp token handled
- [ ] Multiple rapid attempts handled
- [ ] Browser refresh on 2FA page
- [ ] Network errors handled gracefully

---

## Support

For issues or questions:
- Check this documentation
- Review error messages carefully
- Test with fresh QR code scan
- Contact support if problems persist

---

## References

- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [RFC 4226 - HOTP](https://tools.ietf.org/html/rfc4226)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Speakeasy Library](https://github.com/speakeasyjs/speakeasy)
- [QRCode Library](https://github.com/soldair/node-qrcode)
