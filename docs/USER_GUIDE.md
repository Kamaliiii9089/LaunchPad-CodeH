# BreachBuddy - User Guide

Welcome to BreachBuddy! This guide will help you get the most out of your digital security platform.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Subscription Management](#subscription-management)
4. [Security Breach Monitoring](#security-breach-monitoring)
5. [API Surface Scanner](#api-surface-scanner)
6. [Settings](#settings)
7. [Best Practices](#best-practices)

---

## Getting Started

### Creating an Account

BreachBuddy offers two ways to create an account for your convenience.

#### Option 1: Email/Password Registration

1. Navigate to the BreachBuddy homepage
2. Click **"Get Started"** or **"Sign Up"**
3. Fill in the registration form:
   - **Full Name**: Your name for personalization
   - **Email Address**: A valid email you have access to
   - **Password**: Create a strong password (requirements below)
   - **Confirm Password**: Re-enter your password
4. Click **"Create Account"**
5. You'll be automatically logged in and redirected to the dashboard

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- Example: `SecurePass123`, `MyEmail2024!`

**Benefits of Email/Password:**
- ✅ No dependency on third-party services
- ✅ Full control over your credentials
- ✅ Works even if Google services are down
- ✅ Can be used alongside Google OAuth

#### Option 2: Google Sign-In (OAuth)

1. Navigate to the BreachBuddy homepage
2. Click **"Get Started"** or **"Sign Up"**
3. Click the **"Continue with Google"** button
4. Select your Google account
5. Grant the necessary permissions
6. You'll be automatically logged in and redirected to the dashboard

**Benefits of Google Sign-In:**
- ✅ Faster registration (one click)
- ✅ No need to remember another password
- ✅ Automatic Gmail integration
- ✅ Enhanced security with Google's 2FA

**Note:** You can use both methods with the same email address. If you register with email/password first, you can still use Google Sign-In later with the same email.

---

### First Login

After creating your account using either method:
1. You'll be redirected to the dashboard
2. **If using email/password:** You may need to connect Gmail for subscription scanning (optional)
3. **If using Google Sign-In:** Gmail integration is automatic
4. Complete the initial security scan to discover your subscriptions

---

### Logging In

#### Email/Password Login

1. Navigate to the login page
2. Enter your **Email Address**
3. Enter your **Password**
4. Click **"Sign In"**
5. You'll be redirected to your dashboard

**Forgot Your Password?**
- Currently, password reset is not available
- Contact support if you need assistance
- Consider using Google Sign-In as a backup

#### Google Sign-In

1. Navigate to the login page
2. Click **"Continue with Google"**
3. Select your Google account
4. You'll be redirected to your dashboard

#### Two-Factor Authentication (2FA)

If you've enabled 2FA:
1. Log in with your email/password or Google
2. Enter the 6-digit code from your authenticator app
3. Click **"Verify"** to complete login

---

### Switching Between Login Methods

You can use both login methods with the same account:

**Scenario 1:** Registered with email/password, want to use Google
- Just click "Continue with Google" on the login page
- Use the same email address
- Both methods will work with your account

**Scenario 2:** Registered with Google, want to use email/password
- Currently, you'll need to contact support to set a password
- Or create a new account with email/password

---

### First Login

After creating your account:
1. You'll be redirected to the dashboard
2. Connect your Gmail account (required for subscription scanning)
3. Complete the initial security scan

---

## Dashboard

### Overview

The dashboard provides a comprehensive view of your digital security status.

#### Key Metrics

- **Unique Companies**: Number of different services with your email
- **Total Services**: Total subscription count
- **Active**: Services you're currently subscribed to
- **Revoked**: Services you've unsubscribed from

#### Navigation

Use the sidebar to access:
- 🏠 **Dashboard** - Overview and statistics
- 📧 **Subscriptions** - Manage all subscriptions
- 🔒 **Security Check** - Monitor data breaches
- 🌐 **Surface Scanner** - Scan domains for vulnerabilities
- ⚙️ **Settings** - Account preferences

### Scanning Your Emails

#### Initial Scan

1. Click **"Deep Scan Emails"** button
2. Authorize Gmail access if prompted
3. Wait for the scan to complete (2-5 minutes)
4. Review discovered subscriptions

#### What Gets Scanned

The email scanner analyzes:
- Sender email addresses
- Email subjects and content
- Unsubscribe links
- Service domains
- Email categories

#### Scan Progress

Monitor scan progress in real-time:
- Progress percentage
- Emails scanned
- Subscriptions found
- Estimated time remaining

---

## Subscription Management

### Viewing Subscriptions

Navigate to **Subscriptions** from the sidebar.

#### Subscription List View

Each subscription shows:
- **Service Name**: Name of the company/service
- **Service Email**: Email address used by the service
- **Domain**: Website domain
- **Category**: Type of subscription
- **Status**: Active or Revoked
- **Last Email**: Date of most recent email
- **Email Count**: Total emails received

#### Filtering Subscriptions

Use filters to find specific subscriptions:

**Search Bar**: Type service name or domain
```
Example: "GitHub" or "github.com"
```

**Category Filter**:
- Subscription
- Newsletter
- Verification
- Login
- Billing
- Other

**Status Filter**:
- All Status
- Active
- Revoked

**Sort Options**:
- Latest Email
- Recently Added
- Name A-Z
- Name Z-A

### Managing Individual Subscriptions

#### View Details

Click on any subscription to see:
- Complete email history
- All emails from this service
- Unsubscribe link (if available)
- First detection date

#### Revoke Access

To stop receiving emails:
1. Click the **three dots** (⋮) menu
2. Select **"Revoke Access"**
3. Confirm the action

This marks the subscription as revoked in your dashboard.

#### Grant Access

To restore a revoked subscription:
1. Find the revoked subscription
2. Click the **three dots** (⋮) menu
3. Select **"Grant Access"**

#### Delete Subscription

To permanently remove from your list:
1. Click the **three dots** (⋮) menu
2. Select **"Delete"**
3. Confirm deletion

⚠️ **Warning**: This removes the subscription from your dashboard but doesn't unsubscribe you from the service.

#### Unsubscribe from Service

To stop emails at the source:
1. Click the **three dots** (⋮) menu
2. Select **"Unsubscribe"**
3. You'll be redirected to the service's unsubscribe page

### Bulk Operations

Manage multiple subscriptions at once:

#### Select Multiple

1. Check the boxes next to subscriptions
2. Or use **"Select All"** checkbox in header

#### Bulk Actions

With subscriptions selected:
- **Grant Access**: Activate all selected
- **Revoke Access**: Deactivate all selected
- **Delete**: Remove all selected

Example: Revoke all newsletter subscriptions
1. Filter by Category: Newsletter
2. Select all
3. Click "Revoke Access"

---

## Security Breach Monitoring

### Understanding Breach Checks

Navigate to **Security Check** from the sidebar.

#### What is Breach Monitoring?

BreachBuddy checks if your email addresses have appeared in known data breaches using the Have I Been Pwned (HIBP) database.

### Breach Dashboard

#### Security Score

- **Scale**: 0-10 (10 = highest risk)
- **Factors**:
  - Number of breaches
  - Severity of breaches
  - Compromised data types
  - Breach recency

#### Breach Statistics

- **Total Breaches**: Number of breaches your email appeared in
- **Accounts Exposed**: Number of accounts potentially compromised
- **At Risk**: Accounts requiring immediate action

### Breach Details

Each breach shows:
- **Service Name**: Website/service that was breached
- **Breach Date**: When the breach occurred
- **Impact**: Number of accounts affected
- **Compromised Data**: Types of data exposed (emails, passwords, etc.)
- **Severity Level**: High, Medium, or Low risk

### Taking Action

#### High-Risk Breaches

1. **Change Passwords Immediately**
   - Use strong, unique passwords
   - Never reuse passwords

2. **Enable Two-Factor Authentication (2FA)**
   - Add extra security layer
   - Use authenticator apps

3. **Monitor Account Activity**
   - Check for suspicious logins
   - Review recent transactions

#### Medium-Risk Breaches

1. **Update Passwords**: Change on affected services
2. **Review Security Settings**: Check account permissions
3. **Watch for Phishing**: Be alert for scam emails

#### Low-Risk Breaches

1. **Review Information**: Know what was exposed
2. **Consider Password Update**: If using old password
3. **Stay Informed**: Monitor breach updates

### Security Tips

The dashboard provides personalized security recommendations:

- **Use Unique Passwords**: Different password for each service
- **Enable 2FA**: Extra protection layer
- **Regular Monitoring**: Check breaches regularly
- **Clean Up Unused Accounts**: Reduce attack surface

---

## API Surface Scanner

### What is API Surface Scanning?

The Surface Scanner discovers:
- Subdomains of a domain
- Exposed API endpoints
- Potential security vulnerabilities
- Risk assessment

### Running a Scan

Navigate to **Surface Scanner** from the sidebar.

#### Quick Scan

Fast overview of a domain:

1. Enter domain name: `example.com`
2. Click **"Quick Scan"**
3. Wait 10-30 seconds
4. View results

**Quick Scan Shows**:
- Number of subdomains
- Number of endpoints
- Vulnerability count
- Risk score (0-10)

#### Deep Scan

Comprehensive analysis:

1. Enter domain name: `example.com`
2. Click **"Deep Scan"**
3. Wait 1-3 minutes
4. View detailed results

**Deep Scan Shows**:
- All discovered subdomains
- Complete endpoint list
- Detailed vulnerability reports
- Authentication requirements
- Response codes

### Understanding Results

#### Risk Score

- **0-3**: Low Risk (Green)
- **4-6**: Medium Risk (Yellow)
- **7-10**: High Risk (Red)

#### Vulnerability Severity

**High**: Immediate security concern
- Exposed databases
- Unauthenticated admin panels
- Critical security misconfigurations

**Medium**: Potential security issue
- Information disclosure
- Weak security headers
- Outdated software versions

**Low**: Minor concerns
- Non-critical information leaks
- Best practice violations

### Scan History

View previous scans:
- Domain scanned
- Scan date
- Risk score
- Comparison with previous scans

Click any historical scan to view full details.

---

## Settings

### Profile Settings

Update your personal information:
- **Name**: Display name
- **Email**: Account email (cannot be changed)

### Security Settings

#### Change Password

1. Enter current password
2. Enter new password
3. Confirm new password
4. Click "Save"

Requirements:
- Minimum 8 characters
- Mix of letters and numbers
- At least one special character

#### Gmail Access

Manage Gmail integration:
- **Revoke Gmail Access**: Disconnect Gmail
- **Re-authenticate**: Reconnect Gmail account

### Preferences

#### Email Notifications

Configure email alerts:
- New breach detections
- Scan completion
- Security recommendations

#### Auto Scan

Enable automatic email scanning:
- Daily
- Weekly
- Monthly
- Disabled

### Danger Zone

#### Delete Account

⚠️ **Warning**: Permanent action

This will:
- Delete all your data
- Remove all subscriptions
- Revoke OAuth tokens
- Close your account

Cannot be undone.

---

## Best Practices

### Email Security

1. **Regular Scans**: Run email scans monthly
2. **Review Subscriptions**: Check and clean up quarterly
3. **Monitor Breaches**: Check security status weekly
4. **Update Passwords**: Change passwords for breached accounts immediately

### Subscription Management

1. **Categorize**: Keep subscriptions organized
2. **Unsubscribe**: Remove unwanted subscriptions
3. **Use Filters**: Create Gmail filters for important emails
4. **Review Regularly**: Audit subscriptions monthly

### Account Security

1. **Strong Passwords**: Use password manager
2. **Enable 2FA**: On all important accounts
3. **Unique Passwords**: Never reuse passwords
4. **Regular Updates**: Change passwords periodically

### Privacy Tips

1. **Use Disposable Emails**: For trials and one-time signups
2. **Check Permissions**: Review app permissions regularly
3. **Delete Unused Accounts**: Reduce digital footprint
4. **Be Cautious**: Verify sender before clicking links

---

## Keyboard Shortcuts

Speed up your workflow:

- `Ctrl/Cmd + K`: Open search
- `Ctrl/Cmd + R`: Refresh data
- `Ctrl/Cmd + S`: Open settings
- `Esc`: Close modals/dialogs

---

## Mobile Usage

BreachBuddy is fully responsive:

### Mobile Navigation

- Tap hamburger menu (☰) to open sidebar
- Swipe to close sidebar
- Pull to refresh on lists

### Mobile Tips

- Use landscape mode for tables
- Enable notifications for alerts
- Save to home screen for quick access

---

## Troubleshooting

### Common Issues

#### Gmail Scan Not Working

1. Check Gmail authentication
2. Verify sufficient permissions
3. Try re-authenticating
4. Check network connection

#### Subscriptions Not Showing

1. Ensure scan completed successfully
2. Refresh the page
3. Clear filters
4. Check search query

#### Breach Check Empty

1. Verify email address
2. Wait for initial check to complete
3. Refresh the page
4. No breaches found (good news!)

### Getting Help

1. Check [FAQ](./FAQ.md)
2. Email support: support@breachbuddy.com
3. GitHub Issues: Report bugs
4. Community: Join discussions

---

## Tips & Tricks

### Pro Tips

1. **Batch Processing**: Select multiple subscriptions for bulk actions
2. **Smart Filters**: Combine search with filters
3. **Export Data**: Use scan results for documentation
4. **Share Findings**: Report vulnerabilities responsibly

### Advanced Features

1. **API Access**: Use API for automation (coming soon)
2. **Webhooks**: Set up breach notifications (coming soon)
3. **Integrations**: Connect with other tools (coming soon)

---

## What's Next?

- Explore [API Documentation](./API.md)
- Read [FAQ](./FAQ.md)
- Check [Development Guide](./DEVELOPMENT.md)

Happy securing! 🛡️
