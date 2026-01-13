# Frequently Asked Questions (FAQ)

## General Questions

### What is BreachBuddy?

BreachBuddy is a comprehensive digital security platform that helps you manage your Gmail subscriptions, monitor data breaches, and scan API surfaces for vulnerabilities. It combines subscription management, security monitoring, and vulnerability scanning in one unified dashboard.

### Is BreachBuddy free?

Yes, BreachBuddy is currently free to use. However, some features require API keys from third-party services (like Have I Been Pwned) which may have associated costs.

### What data does BreachBuddy collect?

BreachBuddy collects:
- Your name and email address
- Gmail subscription information (with your permission)
- Security scan results
- Usage analytics (anonymous)

We never store your Gmail password or access your email content beyond sender information.

### Is my data secure?

Yes! BreachBuddy uses industry-standard security practices:
- Encrypted data transmission (HTTPS)
- JWT-based authentication
- Password hashing with bcrypt
- Secure OAuth 2.0 for Gmail access
- Regular security audits

---

## Account & Authentication

### How do I create an account?

1. Visit the BreachBuddy homepage
2. Click "Get Started" or "Sign Up"
3. Choose either:
   - Email/password registration
   - Sign in with Google

### I forgot my password. How do I reset it?

Password reset feature is coming soon. For now, contact support@breachbuddy.com for assistance.

### Can I change my email address?

Currently, you cannot change your account email address. This is your permanent identifier. If you need to change it, you'll need to create a new account.

### How do I delete my account?

1. Go to Settings
2. Scroll to "Danger Zone"
3. Click "Delete Account"
4. Confirm deletion

⚠️ **Warning**: This action cannot be undone and will permanently delete all your data.

### Why do you need access to my Gmail?

Gmail access is required to scan your inbox for subscriptions. We use read-only access and only analyze sender information and unsubscribe links. We never read your email content or store sensitive information.

---

## Subscription Management

### How does email scanning work?

When you click "Deep Scan Emails":
1. We connect to your Gmail account via OAuth
2. We scan your emails (typically last 500-1000 messages)
3. We extract sender information and categorize by service
4. We identify unsubscribe links
5. Results are displayed in your Subscriptions page

### How long does a scan take?

Typical scan times:
- **Quick scan** (100 emails): 30 seconds
- **Standard scan** (500 emails): 2-3 minutes
- **Deep scan** (1000+ emails): 5-7 minutes

### Why aren't all my subscriptions showing?

Possible reasons:
- Scan hasn't completed yet
- Emails are older than scan range
- Sender uses unusual email format
- Subscription emails were deleted
- Service doesn't send regular emails

Try running another scan with a larger email range.

### Can I manually add a subscription?

Not currently. Subscriptions are automatically discovered through email scanning. This feature is planned for a future update.

### What does "Revoke Access" actually do?

"Revoke Access" marks a subscription as inactive in your dashboard. It does NOT:
- Unsubscribe you from emails
- Block emails from that service
- Delete your account with that service

To stop receiving emails, use the "Unsubscribe" button to visit the service's unsubscribe page.

### How do I actually unsubscribe from a service?

1. Find the subscription in your list
2. Click the three dots (⋮) menu
3. Select "Unsubscribe"
4. You'll be redirected to the service's unsubscribe page
5. Follow their unsubscribe process

---

## Breach Monitoring

### What is a data breach?

A data breach occurs when unauthorized parties gain access to sensitive data, such as:
- Email addresses
- Passwords
- Personal information
- Financial data

### How does breach checking work?

BreachBuddy uses the Have I Been Pwned (HIBP) API to check if your email addresses have appeared in known data breaches. HIBP maintains a database of billions of compromised accounts from verified breaches.

### What does "pwned" mean?

"Pwned" is internet slang meaning "owned" or "compromised." If your email has been "pwned," it appeared in a data breach.

### I found a breach - what should I do?

**Immediate actions:**

1. **Change Your Password**
   - Use a strong, unique password
   - Never reuse passwords

2. **Enable Two-Factor Authentication (2FA)**
   - Add extra security layer
   - Use authenticator apps (not SMS)

3. **Monitor Account Activity**
   - Check recent logins
   - Review transactions
   - Look for suspicious activity

4. **Consider Credit Monitoring**
   - For breaches with financial data
   - Watch for identity theft signs

### How often should I check for breaches?

We recommend:
- **Weekly**: Quick check
- **Monthly**: Comprehensive review
- **After major news**: When big breaches are announced

### Can BreachBuddy prevent breaches?

No, BreachBuddy cannot prevent breaches at other companies. However, it helps you:
- Know when your data is compromised
- Respond quickly to minimize damage
- Track your security status
- Follow best practices

### Why is my security score low?

Your security score is affected by:
- Number of breaches
- Types of data exposed (passwords are high risk)
- Breach recency
- Severity of breaches

Improve it by:
- Changing passwords on breached accounts
- Enabling 2FA
- Deleting unused accounts
- Using unique passwords

---

## API Surface Scanner

### What is API surface scanning?

API surface scanning identifies:
- Subdomains of a website
- Exposed API endpoints
- Potential security vulnerabilities
- Misconfigurations

### Is surface scanning legal?

Yes, when used responsibly:
- ✅ Scan domains you own
- ✅ Scan with permission
- ✅ For security research
- ✅ Educational purposes

❌ Don't use for:
- Malicious hacking
- Unauthorized access
- Exploit development
- Service disruption

### What's the difference between Quick and Deep scan?

**Quick Scan**:
- Fast (10-30 seconds)
- Basic subdomain discovery
- High-level vulnerability check
- Risk score

**Deep Scan**:
- Comprehensive (1-3 minutes)
- Detailed subdomain enumeration
- Complete endpoint discovery
- In-depth vulnerability analysis
- Authentication checks

### What do risk scores mean?

- **0-3** (Low): Minimal security concerns
- **4-6** (Medium): Some issues to address
- **7-10** (High): Critical vulnerabilities found

### Can I scan any domain?

Yes, you can scan any public domain. However:
- Only scan domains you own or have permission to scan
- Use results responsibly
- Report vulnerabilities ethically

### My scan timed out - why?

Common reasons:
- Domain has too many subdomains
- Network connectivity issues
- Rate limiting by target
- Server overload

Try again with a more specific target or during off-peak hours.

---

## Technical Questions

### What browsers are supported?

BreachBuddy works on all modern browsers:
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

Minimum versions: Released within last 2 years

### Is there a mobile app?

Not yet, but the web app is fully responsive and works great on mobile browsers. Native mobile apps are planned for the future.

### Can I use BreachBuddy on multiple devices?

Yes! Log in from any device with the same account. Your data is synchronized across all devices.

### Does BreachBuddy work offline?

No, BreachBuddy requires an internet connection to:
- Sync with Gmail
- Check breaches
- Scan domains
- Load your dashboard

### What happens to my data if I stop using BreachBuddy?

Your data remains in your account until you:
- Delete your account, or
- Request data deletion

We don't automatically delete inactive accounts.

### Can I export my data?

Data export feature is coming soon. For now, contact support@breachbuddy.com for manual export.

---

## Troubleshooting

### Gmail scan isn't working

**Try these steps:**

1. **Re-authenticate Gmail**
   - Settings → Gmail Access → Re-authenticate

2. **Check permissions**
   - Ensure you granted "read-only" access
   - Visit Google Account → Security → Third-party apps

3. **Clear browser cache**
   - Clear cookies and cache
   - Log out and log back in

4. **Try different browser**
   - Use Chrome/Firefox

### Subscriptions not appearing

**Common causes:**

1. **Scan still in progress**
   - Wait for scan to complete
   - Check progress indicator

2. **Filters applied**
   - Click "Clear All Filters"
   - Check search box is empty

3. **No subscriptions found**
   - Scan more emails
   - Check older emails

### Breach check shows nothing

**Possible reasons:**

1. **Good news!**
   - No breaches found for your email

2. **Still loading**
   - Wait a few moments
   - Refresh the page

3. **HIBP API issue**
   - Check internet connection
   - Try again later

### Login issues

**Solutions:**

1. **Check credentials**
   - Verify email/password
   - Case-sensitive

2. **Clear browser data**
   - Clear cookies
   - Try incognito mode

3. **Try Google Sign-In**
   - Use OAuth instead

4. **Reset password**
   - Contact support

### Page loading slowly

**Speed up loading:**

1. **Check internet connection**
   - Test other websites

2. **Clear browser cache**
   - May help performance

3. **Disable browser extensions**
   - Some extensions slow pages

4. **Try different browser**
   - Compare speeds

---

## Billing & Plans

### Is there a paid plan?

Not currently. BreachBuddy is free to use. We may introduce premium features in the future.

### Do I need to pay for API keys?

Some features require third-party API keys:
- **HIBP API**: $3.50/month (for breach checking)
- **Other APIs**: Free options available

### Will BreachBuddy always be free?

The core features will remain free. We may introduce premium features for advanced users in the future.

---

## Privacy & Security

### Do you sell my data?

**Never.** We do not and will never sell your personal data to third parties.

### Who can see my data?

Only you can see your data. BreachBuddy staff cannot access your:
- Email content
- Subscription details
- Personal information

unless required for technical support with your explicit permission.

### How long do you keep my data?

We keep your data as long as your account is active. When you delete your account, your data is permanently removed within 30 days.

### Can I request my data?

Yes! Email support@breachbuddy.com with your account email to request:
- Complete data export
- Data deletion
- Privacy report

### Is BreachBuddy GDPR compliant?

Yes, BreachBuddy complies with GDPR regulations. You have the right to:
- Access your data
- Correct your data
- Delete your data
- Export your data
- Restrict processing

---

## Feature Requests

### Can I suggest a feature?

Yes! We love feedback. Submit feature requests:
- GitHub Issues
- Email: support@breachbuddy.com
- Community forum (coming soon)

### Upcoming features

Planned features:
- [ ] Password reset
- [ ] Data export
- [ ] Email templates
- [ ] Mobile apps
- [ ] Webhook notifications
- [ ] API access
- [ ] Team accounts
- [ ] Multi-email support

---

## Getting Help

### How do I contact support?

**Email**: support@breachbuddy.com
**Response Time**: 24-48 hours
**Hours**: Monday-Friday, 9 AM - 5 PM EST

### Is there a community forum?

Coming soon! We're building a community space for:
- Questions & answers
- Feature discussions
- Tips & tricks
- User stories

### Can I contribute to BreachBuddy?

Yes! BreachBuddy is open source. Contribute by:
- Reporting bugs
- Suggesting features
- Submitting pull requests
- Improving documentation

See [CONTRIBUTING.md](../CONTRIBUTING.md) for details.

### Where can I report bugs?

Report bugs on:
- **GitHub Issues**: https://github.com/yourusername/LaunchPad-CodeH/issues
- **Email**: support@breachbuddy.com

Include:
- Detailed description
- Steps to reproduce
- Screenshots
- Browser/OS info

---

## Didn't find your answer?

Contact us:
- **Email**: support@breachbuddy.com
- **GitHub**: Open an issue
- **Twitter**: @breachbuddy (coming soon)

---

Last Updated: January 13, 2026
