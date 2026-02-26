# BreachBuddy Frontend - Complete Documentation

A modern, secure, and fully functional Next.js 14 frontend for BreachBuddy - a next-generation security dashboard.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free at https://mongodb.com/cloud/atlas)
- npm or yarn

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📋 Project Features

### 🌐 Frontend Pages
- **Home** (`/`) - Landing page with hero section, features, and CTA
- **Features** (`/features`) - Detailed feature list
- **Pricing** (`/pricing`) - 3-tier pricing model
- **About** (`/about`) - Company information
- **Blog** (`/blog`) - Security articles
- **Contact** (`/contact`) - Contact form
- **Privacy** (`/privacy`) - Privacy policy
- **Terms** (`/terms`) - Terms of service
- **Login** (`/login`) - User authentication with device fingerprinting
- **Signup** (`/signup`) - User registration with validation
- **Dashboard** (`/dashboard`) - Protected security dashboard

### 🔐 Authentication System
- ✅ User registration with validation
- ✅ Secure password hashing (bcryptjs)
- ✅ JWT-based authentication
- ✅ Protected routes with middleware
- ✅ Token refresh capability
- ✅ User profile display
- ✅ Logout functionality
- ✅ **Two-Factor Authentication (TOTP)**
- ✅ **Backup codes with usage tracking**
- ✅ **Device-based authentication**

### 🛡️ Security Features
- ✅ **Device fingerprinting** - Unique device identification
- ✅ **Browser security monitoring** - Real-time security scoring (0-100)
- ✅ **Suspicious device detection** - Bot, automation, and Tor detection
- ✅ **Trusted device management** - Device trust scores and history
- ✅ **Form validation** - Client & server-side validation
- ✅ **Input sanitization** - XSS and injection prevention
- ✅ **Security event dashboard** - Real-time threat monitoring
- ✅ **Session management** - Per-device session tracking

### 📊 Dashboard Features
- ✅ Security metrics overview (threats blocked, vulnerabilities, system health)
- ✅ Security events list with pagination
- ✅ Threat investigation and resolution
- ✅ Analytics with charts and graphs
- ✅ **Browser security score** with circular progress indicator
- ✅ **Current device information** with trust score
- ✅ **Trusted devices list** with management controls
- ✅ **Security warnings** display
- ✅ 2FA management (enable, disable, regenerate codes)
- ✅ Security preferences
- ✅ PDF report generation
- ✅ CSV data export

### 🔌 API Endpoints

#### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - Login with device validation
- `GET /api/auth/verify` - Token verification

#### Two-Factor Authentication
- `POST /api/auth/2fa/setup` - Generate 2FA secret and QR code
- `POST /api/auth/2fa/enable` - Enable 2FA with verification
- `POST /api/auth/2fa/disable` - Disable 2FA with code
- `POST /api/auth/2fa/verify` - Verify 2FA code
- `POST /api/auth/2fa/verify-login` - 2FA login verification
- `POST /api/auth/2fa/backup-codes` - Regenerate backup codes

#### Device Management
- `GET /api/devices` - List all trusted devices
- `POST /api/devices/verify` - Verify current device
- `POST /api/devices/trust` - Trust device (requires 2FA)
- `DELETE /api/devices` - Remove trusted device

#### Reports
- `POST /api/reports/generate` - Generate PDF report
- `POST /api/reports/export` - Export data as CSV
- `POST /api/reports/schedule` - Schedule report generation
- `GET /api/reports/templates` - Get report templates

### Backend API

#### POST `/api/auth/signup`
Create new user account
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

#### POST `/api/auth/login`
Authenticate user
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

#### GET `/api/auth/verify`
Verify JWT token
```bash
curl -X GET http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com"
  }
}
```

## 🗂️ Project Structure

```
breachbuddy/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── signup/route.ts         # User registration
│   │   │   ├── login/route.ts          # User authentication (with device validation)
│   │   │   ├── verify/route.ts         # Token verification
│   │   │   └── 2fa/
│   │   │       ├── setup/route.ts      # 2FA setup
│   │   │       ├── enable/route.ts     # Enable 2FA
│   │   │       ├── disable/route.ts    # Disable 2FA
│   │   │       ├── verify/route.ts     # Verify 2FA code
│   │   │       ├── verify-login/route.ts # 2FA login verification
│   │   │       └── backup-codes/route.ts # Backup codes management
│   │   ├── devices/
│   │   │   ├── route.ts                # List/remove devices
│   │   │   ├── verify/route.ts         # Verify current device
│   │   │   └── trust/route.ts          # Trust device (requires 2FA)
│   │   └── reports/
│   │       ├── generate/route.ts       # Generate PDF reports
│   │       ├── export/route.ts         # Export CSV data
│   │       ├── schedule/route.ts       # Schedule reports
│   │       └── templates/route.ts      # Report templates
│   ├── dashboard/page.tsx              # Protected dashboard with security features
│   ├── login/page.tsx                  # Login page (with device fingerprinting)
│   ├── signup/page.tsx                 # Sign up page
│   ├── features/page.tsx               # Features page
│   ├── pricing/page.tsx                # Pricing page
│   ├── about/page.tsx                  # About page
│   ├── blog/page.tsx                   # Blog page
│   ├── contact/page.tsx                # Contact page
│   ├── privacy/page.tsx                # Privacy policy
│   ├── terms/page.tsx                  # Terms of service
│   ├── layout.tsx                      # Root layout
│   ├── globals.css                     # Global styles
│   └── page.tsx                        # Home page
├── components/
│   ├── Navigation.tsx                  # Nav with auth state
│   ├── Footer.tsx                      # Footer
│   ├── HeroSection.tsx                 # Hero section
│   ├── FeaturesSection.tsx             # Features showcase
│   ├── AboutSection.tsx                # About section
│   ├── CTASection.tsx                  # Call-to-action
│   ├── TwoFactorSetup.tsx              # 2FA setup modal
│   ├── TwoFactorVerify.tsx             # 2FA verification modal
│   ├── FormInput.tsx                   # Validated form input
│   ├── Pagination.tsx                  # Pagination component
│   ├── EventsList.tsx                  # Security events list
│   ├── Toast.tsx                       # Toast notification
│   └── ToastContainer.tsx              # Toast container with hook
├── lib/
│   ├── mongodb.ts                      # MongoDB connection
│   ├── auth.ts                         # Auth utilities
│   ├── useAuth.ts                      # Auth React hook
│   ├── validation.ts                   # Form validation utilities
│   ├── deviceFingerprint.ts            # Server-side device fingerprinting
│   ├── deviceSecurity.ts               # Client-side security utilities
│   └── reportGenerator.ts              # PDF report generation
├── models/
│   ├── User.ts                         # User schema (with devices & sessions)
│   ├── Report.ts                       # Report schema
│   └── ReportTemplate.ts               # Report template schema
├── middleware.ts                        # Route protection
├── .env.local                           # Environment config
├── package.json
└── Documentation/
    ├── 2FA_DOCUMENTATION.md
    ├── DEVICE_SECURITY_DOCUMENTATION.md
    ├── FORM_VALIDATION_DOCUMENTATION.md
    ├── SECURITY_FEATURES_SUMMARY.md
    ├── API_TESTING.md
    ├── PAGINATION_DOCUMENTATION.md
    ├── REPORTING_DOCUMENTATION.md
    ├── QUICK_START.md
    └── SETUP.md
```

## 🔐 Environment Setup

Create `.env.local`:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/breachbuddy?retryWrites=true&w=majority

# Application URLs
NEXTAUTH_URL=http://localhost:3000

# Secrets (generate random strings for production)
NEXTAUTH_SECRET=your-secret-key-here
JWT_SECRET=your-jwt-secret-here
```

## 🧪 Testing

### Test Sign Up Flow
1. Navigate to `/signup`
2. Fill in all fields:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
3. Click "Create Account"
4. Should redirect to dashboard

### Test Login Flow
1. Navigate to `/login`
2. Enter credentials:
   - Email: test@example.com
   - Password: password123
3. Click "Sign In"
4. Should redirect to dashboard

### Test Route Protection
1. Open `/dashboard` in new tab without logging in
2. Should redirect to `/login`

## 📱 Responsive Design

- ✅ Mobile-first approach
- ✅ Tailwind CSS utilities
- ✅ Responsive navigation menu
- ✅ Mobile-optimized forms
- ✅ Tablet and desktop layouts

## 🔒 Security Features

### 🔐 Authentication & Authorization
- Password hashing with bcryptjs (10 salt rounds)
- JWT tokens with 7-day expiration
- Secure password validation (min 6 characters)
- **Two-Factor Authentication (2FA)** with TOTP
- Backup codes with usage tracking
- Session management per device

### 🛡️ Device Security
- **Device fingerprinting** for unique identification
- **Browser security monitoring** with real-time scoring (0-100)
- **Suspicious device detection** (headless browsers, bots, automation tools)
- **Trusted device management** with trust scores
- Device usage history and analytics
- IP address and location tracking

### 📝 Input Validation
- Client-side validation with real-time feedback
- Server-side validation for all inputs
- XSS prevention through sanitization
- SQL injection prevention
- Pattern matching (email, passwords, etc.)

### 🗄️ Database
- MongoDB with Mongoose ODM
- Unique email constraint
- Automatic timestamps
- Secure device and session storage

### 🔌 API Protection
- Request validation
- Bearer token authentication
- Error handling without information leakage
- HTTP status codes
- Secure response objects

### 💻 Frontend
- Token storage in localStorage
- Protected route middleware
- XSS prevention (Next.js built-in)
- CSRF protection
- Real-time security monitoring

### 📊 Security Monitoring
- Real-time threat detection
- Security event logging
- Failed login attempt tracking
- Device trust score calculation
- Browser security assessment

## 🎨 Styling

- **Tailwind CSS** - Utility-first CSS framework
- **Custom classes** in `app/globals.css`
- Dark mode ready (can be extended)
- Consistent color scheme (blue primary)

## 📦 Dependencies

### Core Dependencies
```json
{
  "react": "^18.2.0",
  "next": "^14.0.0",
  "mongoose": "^7.6.0",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.1.0",
  "tailwindcss": "^3.3.0"
}
```

### Security Dependencies
```json
{
  "speakeasy": "^2.0.0",        // TOTP for 2FA
  "qrcode": "^1.5.3",           // QR code generation
  "crypto": "built-in"          // Device fingerprinting
}
```

### Utilities
```json
{
  "pdfkit": "^0.13.0",          // PDF report generation (if implemented)
  "zod": "^3.22.0"              // Schema validation (optional)
}
```

### Development Dependencies
```json
{
  "@types/react": "^18.2.0",
  "@types/node": "^20.0.0",
  "typescript": "^5.0.0",
  "eslint": "^8.0.0"
}
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Manual Deployment
```bash
npm run build
npm start
```

Set environment variables on your hosting platform.

## 📝 API Error Handling

All API responses follow this format:

**Success:**
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP Status Codes:
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `409` - Conflict (duplicate email)
- `500` - Server Error

## 🔄 User Flow

```
Home Page
    ↓
[Sign Up] → Create Account → Dashboard
    ↓
[Login] → Authenticate → Dashboard
    ↓
[View Profile] → Logout → Home
```

## 🎯 Features Status

### ✅ Completed Features
- ✅ User registration and authentication
- ✅ JWT-based session management
- ✅ Protected routes with middleware
- ✅ Two-factor authentication (2FA)
- ✅ Backup codes with regeneration
- ✅ Device fingerprinting
- ✅ Browser security monitoring
- ✅ Suspicious device detection
- ✅ Trusted device management
- ✅ Form validation with sanitization
- ✅ Security event dashboard
- ✅ Real-time threat monitoring
- ✅ PDF report generation
- ✅ CSV data export
- ✅ Pagination for large datasets

### 🚧 Future Enhancements
- [ ] Email verification
- [ ] Password reset/recovery
- [ ] OAuth integration (Google, GitHub)
- [ ] Rate limiting on API endpoints
- [ ] Email notifications for security events
- [ ] Geolocation-based access control
- [ ] WebAuthn/FIDO2 support
- [ ] Advanced anomaly detection (ML-based)
- [ ] Security audit logs export
- [ ] SIEM integration
- [ ] Admin panel
- [ ] Compliance reporting (GDPR, SOC2)

## 🐛 Troubleshooting

### Signup Returns 409
- Email already registered
- Use different email or reset database

### Login Returns 401
- Invalid credentials
- Check email and password

### MongoDB Connection Error
- Verify connection string in `.env.local`
- Check MongoDB Atlas IP whitelist
- Ensure database user permissions

### Port Already in Use
```bash
npm run dev -- -p 3001
```

## 📚 Documentation

### 📖 Complete Documentation Suite

1. **[Quick Start Guide](./QUICK_START.md)** - Get started in minutes
2. **[Setup Guide](./SETUP.md)** - Detailed installation and configuration
3. **[2FA Documentation](./2FA_DOCUMENTATION.md)** - Two-factor authentication implementation
4. **[Form Validation Documentation](./FORM_VALIDATION_DOCUMENTATION.md)** - Input validation and sanitization
5. **[Device Security Documentation](./DEVICE_SECURITY_DOCUMENTATION.md)** - Device fingerprinting and management
6. **[Security Features Summary](./SECURITY_FEATURES_SUMMARY.md)** - Complete security features overview
7. **[API Testing Guide](./API_TESTING.md)** - Test all API endpoints
8. **[Pagination Documentation](./PAGINATION_DOCUMENTATION.md)** - Pagination implementation
9. **[Reporting Documentation](./REPORTING_DOCUMENTATION.md)** - PDF and CSV reports

### 🔍 Key Documentation Highlights

#### Security Implementation
- **Device Fingerprinting**: Unique device identification using browser characteristics
- **Trust Scoring**: Dynamic 0-100 scoring based on device usage patterns
- **Security Monitoring**: Real-time browser security assessment with warnings
- **Threat Detection**: Automated detection of headless browsers, bots, and automation tools
- **2FA Integration**: TOTP-based two-factor authentication with backup codes

#### API Endpoints
- **Authentication**: `/api/auth/login`, `/api/auth/signup`, `/api/auth/verify`
- **2FA Management**: `/api/auth/2fa/*` (setup, enable, disable, verify, backup-codes)
- **Device Management**: `/api/devices` (list, verify, trust, remove)
- **Reports**: `/api/reports/generate`, `/api/reports/export`

#### UI Components
- Dashboard with security metrics
- Device management interface
- Browser security score visualization
- Trusted devices list with trust scores
- Real-time security warnings

## 📄 License

All rights reserved © 2026 BreachBuddy

## 🤝 Support

For issues or questions, contact support@breachbuddy.com

---

**Ready to secure digital identities?** Start with the login page at `/login` or create an account at `/signup`.
