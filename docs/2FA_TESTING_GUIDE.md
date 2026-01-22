# Testing 2FA Implementation

## Quick Test Guide

### Prerequisites
- Backend server running on port 5000
- Frontend running on port 3000
- MongoDB connected
- Valid user account

### Test Flow

#### 1. Setup 2FA

1. **Login to your account**
   - Navigate to http://localhost:3000/login
   - Login with your credentials

2. **Navigate to Settings**
   - Click on Settings in the sidebar
   - Scroll to "Two-Factor Authentication" section

3. **Initiate 2FA Setup**
   - Click "Setup 2FA" button
   - A QR code should appear

4. **Scan QR Code**
   - Open Google Authenticator (or any TOTP app like Authy, Microsoft Authenticator)
   - Scan the QR code displayed
   - Alternatively, manually enter the secret key shown

5. **Verify and Enable**
   - Enter the 6-digit code from your authenticator app
   - Click "Verify & Enable"
   - A modal should appear showing 10 recovery codes

6. **Save Recovery Codes**
   - Click "Download Codes" to save them as a text file
   - Or manually copy and save them securely
   - Click "I've Saved These Codes" to close the modal

✅ **Expected Result**: 2FA is now enabled. The page should reload and show "Two-Factor Authentication is currently ENABLED" with recovery codes status.

#### 2. Test Login with 2FA

1. **Logout**
   - Click logout from the sidebar

2. **Login with Credentials**
   - Enter email and password
   - Click login

3. **2FA Challenge Page**
   - You should be redirected to `/login/2fa`
   - Page shows "Two-Factor Authentication" with a 6-digit code input

4. **Enter Authenticator Code**
   - Open your authenticator app
   - Get the current 6-digit code for LaunchPad
   - Enter it in the input field
   - Click "Verify"

✅ **Expected Result**: You should be logged in and redirected to the dashboard.

#### 3. Test Recovery Code Login

1. **Logout**

2. **Login with Credentials**
   - Enter email and password

3. **On 2FA Challenge Page**
   - Click "Lost your device? Use recovery code →"
   - The input field changes to accept 8-character codes
   - Enter one of your saved recovery codes (e.g., "A1B2C3D4")
   - Click "Verify"

✅ **Expected Result**: 
- You should be logged in successfully
- The recovery code you used should be consumed (can't be used again)
- Recovery code count should decrease by 1

#### 4. Test Recovery Code Status

1. **Go to Settings**
   - Navigate to Two-Factor Authentication section

2. **Check Recovery Codes Section**
   - Should show "Remaining codes: X / 10"
   - If you used one code, it should show 9

✅ **Expected Result**: Accurate count of remaining recovery codes displayed.

#### 5. Test Regenerate Recovery Codes

1. **In Recovery Codes Section**
   - Click "Regenerate Recovery Codes"
   - Enter your current authenticator code
   - Click "Regenerate"

2. **New Recovery Codes Modal**
   - A modal should appear with 10 new codes
   - Download or save them
   - Click "I've Saved These Codes"

✅ **Expected Result**: 
- New recovery codes generated
- Old recovery codes invalidated
- Count back to 10/10

#### 6. Test Disable 2FA

1. **In Settings → Two-Factor Authentication**
   - Click "Disable 2FA"
   - Enter your current authenticator code
   - Click "Confirm Disable"

✅ **Expected Result**: 
- 2FA disabled successfully
- Section now shows "Setup 2FA" button
- All secrets and recovery codes removed from database

---

## Testing Edge Cases

### 1. Invalid Codes

**Test**: Enter wrong authenticator code
- **Expected**: Error message "Invalid authentication code"

**Test**: Enter wrong recovery code
- **Expected**: Error message "Invalid recovery code"

### 2. Session Timeout

**Test**: Wait 5+ minutes after login before entering 2FA code
- **Expected**: Error "Session expired or invalid. Please login again."
- **Result**: Redirect to login page

### 3. Multiple Recovery Code Usage

**Test**: Try to use the same recovery code twice
- **First use**: Should work
- **Second use**: Should fail with "Invalid recovery code"

### 4. QR Code Display

**Test**: Check QR code renders correctly
- Should be a scannable QR code
- Secret key should be displayed in monospace font
- Format: `otpauth://totp/LaunchPad...`

### 5. Recovery Code Count Warning

**Test**: Use 8 recovery codes
- **Expected**: Warning message appears
- "⚠️ Warning: You have less than 3 recovery codes remaining."

### 6. Input Validation

**Test Authenticator Code Input**:
- Should only accept numbers
- Maximum 6 digits
- Auto-formats with letter spacing

**Test Recovery Code Input**:
- Should accept alphanumeric (A-Z, 0-9)
- Maximum 8 characters
- Converts to uppercase
- Monospace font

---

## API Testing with cURL

### Setup 2FA
```bash
curl -X POST http://localhost:5000/api/auth/2fa/setup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Verify 2FA
```bash
curl -X POST http://localhost:5000/api/auth/2fa/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token": "123456"}'
```

### Validate 2FA (Login)
```bash
curl -X POST http://localhost:5000/api/auth/2fa/validate \
  -H "Content-Type: application/json" \
  -d '{
    "tempToken": "TEMP_TOKEN_FROM_LOGIN",
    "token": "123456",
    "isRecoveryCode": false
  }'
```

### Get Recovery Codes Status
```bash
curl -X GET http://localhost:5000/api/auth/2fa/recovery-codes-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Regenerate Recovery Codes
```bash
curl -X POST http://localhost:5000/api/auth/2fa/regenerate-recovery-codes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token": "123456"}'
```

### Disable 2FA
```bash
curl -X POST http://localhost:5000/api/auth/2fa/disable \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token": "123456"}'
```

---

## Common Issues and Solutions

### Issue: "Invalid authentication code" even with correct code

**Possible Causes**:
1. Time synchronization issue
2. Wrong secret scanned
3. Code expired (30-second window)

**Solutions**:
1. Check device time is accurate (enable automatic date/time)
2. Re-setup 2FA with new QR code
3. Enter code immediately after it changes

### Issue: QR code not displaying

**Check**:
1. Console for errors
2. Network tab for API response
3. QRCode library loaded correctly

### Issue: Recovery codes not saving

**Check**:
1. Browser download permissions
2. Pop-up blockers
3. Console errors

### Issue: Session timeout too fast

**Solution**:
- Temporary token is set to 5 minutes
- Adjust in `backend/routes/auth.js`:
```javascript
const tempToken = jwt.sign(
  { id: user._id, scope: '2fa_pending' },
  process.env.JWT_SECRET,
  { expiresIn: '10m' } // Change from 5m to 10m
);
```

---

## Database Verification

### Check User's 2FA Status

Open MongoDB shell or Compass:

```javascript
// Find user by email
db.users.findOne({ email: "test@example.com" })

// Check 2FA fields
db.users.findOne(
  { email: "test@example.com" },
  { 
    is2FAEnabled: 1, 
    twoFactorSecret: 1,
    twoFactorRecoveryCodes: 1
  }
)
```

**Expected fields when 2FA is enabled**:
- `is2FAEnabled`: `true`
- `twoFactorSecret`: Object with `ascii`, `base32`, `hex`, etc.
- `twoFactorRecoveryCodes`: Array of 10 hashed strings

**Expected when 2FA is disabled**:
- `is2FAEnabled`: `false`
- `twoFactorSecret`: `undefined` or not present
- `twoFactorRecoveryCodes`: `undefined` or not present

---

## Performance Testing

### Load Test Login with 2FA

1. Setup 2FA for test account
2. Use a tool like Apache Bench:

```bash
# Test 2FA validation endpoint
ab -n 100 -c 10 -p payload.json -T application/json \
  http://localhost:5000/api/auth/2fa/validate
```

### Monitor Response Times

- Setup: < 500ms
- Verify: < 200ms
- Validate: < 300ms
- Regenerate: < 400ms

---

## Security Checklist

- [ ] TOTP secrets never logged
- [ ] Recovery codes never logged
- [ ] Recovery codes properly hashed
- [ ] Temporary tokens expire (5 min)
- [ ] Used recovery codes removed
- [ ] QR codes only shown once
- [ ] Plain text recovery codes only returned during generation
- [ ] Rate limiting applied to 2FA endpoints
- [ ] Proper error messages (no information disclosure)
- [ ] HTTPS in production
- [ ] Secret fields use `select: false`

---

## Success Criteria

✅ **Setup Flow**
- QR code generates and displays
- Code verification works
- Recovery codes generated and displayed
- All data saved correctly

✅ **Login Flow**
- Password login triggers 2FA
- Authenticator code works
- Recovery code works
- Used recovery codes removed
- Session handling correct

✅ **Management Flow**
- Status displays correctly
- Regeneration works
- Disable works
- All secrets cleared on disable

✅ **Edge Cases**
- Invalid codes rejected
- Session timeout handled
- Multiple recovery codes work
- Warning for low codes

✅ **Security**
- No secrets in logs
- Proper hashing
- Secure storage
- No information leakage

---

## Next Steps

After successful testing:
1. Deploy to staging environment
2. Test with real users
3. Monitor error rates
4. Collect user feedback
5. Consider additional features:
   - SMS backup option
   - Email backup codes
   - Remember device (30 days)
   - WebAuthn/FIDO2 support
