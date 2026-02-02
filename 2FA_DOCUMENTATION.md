# Two-Factor Authentication (2FA) Implementation

## Overview
This project now includes a complete Two-Factor Authentication system using TOTP (Time-based One-Time Password) with backup codes support.

## Features

### 1. **TOTP Authentication**
- Uses industry-standard TOTP algorithm (compatible with Google Authenticator, Authy, Microsoft Authenticator, etc.)
- 6-digit verification codes
- Time window tolerance for clock synchronization issues

### 2. **Backup Codes**
- 8 unique backup codes generated when enabling 2FA
- One-time use codes (automatically removed after use)
- Can be regenerated at any time
- Warning system when running low on backup codes

### 3. **Secure Storage**
- 2FA secrets stored encrypted in database
- Backup codes hashed using bcrypt before storage
- Sensitive fields excluded from default queries

## User Flow

### Enabling 2FA
1. Navigate to Dashboard → Settings
2. Click "Enable Two-Factor Authentication"
3. Scan QR code with authenticator app (or enter secret manually)
4. Verify setup by entering 6-digit code
5. Save backup codes securely

### Login with 2FA
1. Enter email and password
2. If 2FA is enabled, a verification modal appears
3. Enter 6-digit code from authenticator app
4. Alternatively, use a backup code
5. Successfully authenticated

### Disabling 2FA
1. Navigate to Dashboard → Settings
2. Click "Disable Two-Factor Authentication"
3. Enter current 2FA code to confirm
4. 2FA is disabled and all backup codes are removed

### Regenerating Backup Codes
1. Navigate to Dashboard → Settings
2. Click "Regenerate Backup Codes"
3. Enter 2FA code to confirm
4. New backup codes are generated (old ones become invalid)
5. Download and save new codes

## API Endpoints

### POST `/api/auth/2fa/setup`
Generate 2FA secret and QR code
- **Auth Required:** Yes (Bearer token)
- **Returns:** QR code (Data URL) and secret

### POST `/api/auth/2fa/verify`
Verify TOTP code without enabling 2FA
- **Auth Required:** Yes (Bearer token)
- **Body:** `{ code, secret }`
- **Returns:** Verification status

### POST `/api/auth/2fa/enable`
Enable 2FA for user account
- **Auth Required:** Yes (Bearer token)
- **Body:** `{ code, secret }`
- **Returns:** Backup codes

### POST `/api/auth/2fa/disable`
Disable 2FA for user account
- **Auth Required:** Yes (Bearer token)
- **Body:** `{ code }`
- **Returns:** Success status

### POST `/api/auth/2fa/verify-login`
Verify 2FA code during login
- **Auth Required:** No
- **Body:** `{ userId, code }`
- **Returns:** JWT token and user data

### POST `/api/auth/2fa/backup-codes`
Regenerate backup codes
- **Auth Required:** Yes (Bearer token)
- **Body:** `{ code }`
- **Returns:** New backup codes

## Security Considerations

1. **Rate Limiting:** Consider implementing rate limiting on 2FA verification endpoints to prevent brute force attacks

2. **Session Management:** Current implementation uses localStorage. Consider using httpOnly cookies for enhanced security

3. **Recovery Options:** Add email-based recovery for users who lose both their device and backup codes

4. **Audit Logging:** Log all 2FA-related activities (enable, disable, failed attempts)

5. **Device Trust:** Consider implementing "trusted device" functionality to reduce 2FA prompts on known devices

## Testing

### Test Enabling 2FA:
1. Create an account and login
2. Go to Settings tab
3. Click "Enable Two-Factor Authentication"
4. Use a test authenticator app (Google Authenticator recommended)
5. Scan QR code and verify

### Test Login with 2FA:
1. Logout from account with 2FA enabled
2. Login with email/password
3. Verify 2FA prompt appears
4. Enter code from authenticator app
5. Verify successful login

### Test Backup Codes:
1. Enable 2FA and save backup codes
2. Logout
3. Login and use a backup code instead of TOTP
4. Verify code is consumed and can't be reused

## Dependencies

- `speakeasy` - TOTP generation and verification
- `qrcode` - QR code generation
- `bcryptjs` - Backup code hashing

## Database Schema

### User Model Extensions:
```typescript
{
  twoFactorEnabled: Boolean (default: false),
  twoFactorSecret: String (select: false),
  backupCodes: [String] (select: false)
}
```

## Components

- **TwoFactorSetup** - Modal for setting up 2FA with QR code
- **TwoFactorVerify** - Modal for verifying 2FA during login

## Future Enhancements

1. **SMS 2FA** - Add SMS as alternative 2FA method
2. **WebAuthn/FIDO2** - Add hardware security key support
3. **Recovery Email** - Email-based recovery option
4. **2FA Enforcement** - Option to require 2FA for all users
5. **Activity Log** - Show 2FA activity in dashboard
6. **Multiple Devices** - Allow multiple authenticator devices

## Troubleshooting

### QR Code not scanning:
- Ensure camera has proper permissions
- Try entering the secret manually
- Check that time is synchronized on both devices

### Invalid code errors:
- Verify device time is correct
- Try waiting for next code (30-second window)
- Use a backup code if available

### Lost access to authenticator:
- Use backup codes to login
- Contact administrator if no backup codes available
- Consider implementing email recovery
