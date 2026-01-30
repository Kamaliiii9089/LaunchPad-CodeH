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

### Frontend Pages
- **Home** (`/`) - Landing page with hero section, features, and CTA
- **Features** (`/features`) - Detailed feature list
- **Pricing** (`/pricing`) - 3-tier pricing model
- **About** (`/about`) - Company information
- **Blog** (`/blog`) - Security articles
- **Contact** (`/contact`) - Contact form
- **Login** (`/login`) - User authentication
- **Signup** (`/signup`) - User registration
- **Dashboard** (`/dashboard`) - Protected user dashboard

### Authentication System
- ✅ User registration with validation
- ✅ Secure password hashing (bcryptjs)
- ✅ JWT-based authentication
- ✅ Protected routes with middleware
- ✅ Token refresh capability
- ✅ User profile display
- ✅ Logout functionality

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
│   ├── api/auth/
│   │   ├── signup/route.ts      # User registration
│   │   ├── login/route.ts       # User authentication
│   │   └── verify/route.ts      # Token verification
│   ├── dashboard/page.tsx       # Protected dashboard
│   ├── login/page.tsx           # Login page
│   ├── signup/page.tsx          # Sign up page
│   ├── features/page.tsx        # Features page
│   ├── pricing/page.tsx         # Pricing page
│   ├── about/page.tsx           # About page
│   ├── blog/page.tsx            # Blog page
│   ├── contact/page.tsx         # Contact page
│   ├── layout.tsx               # Root layout
│   ├── globals.css              # Global styles
│   └── page.tsx                 # Home page
├── components/
│   ├── Navigation.tsx           # Nav with auth state
│   ├── Footer.tsx               # Footer
│   ├── HeroSection.tsx          # Hero section
│   ├── FeaturesSection.tsx      # Features showcase
│   ├── AboutSection.tsx         # About section
│   └── CTASection.tsx           # Call-to-action
├── lib/
│   ├── mongodb.ts              # MongoDB connection
│   ├── auth.ts                 # Auth utilities
│   └── useAuth.ts              # Auth React hook
├── models/
│   └── User.ts                 # User schema
├── middleware.ts                # Route protection
├── .env.local                   # Environment config
└── package.json
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

### Authentication
- Password hashing with bcryptjs (10 salt rounds)
- JWT tokens with 7-day expiration
- Secure password validation (min 6 characters)

### Database
- MongoDB with Mongoose ODM
- Unique email constraint
- Automatic timestamps

### API Protection
- Request validation
- Error handling
- HTTP status codes
- Secure response objects

### Frontend
- Token storage in localStorage
- Protected route middleware
- XSS prevention (Next.js built-in)
- CSRF protection

## 🎨 Styling

- **Tailwind CSS** - Utility-first CSS framework
- **Custom classes** in `app/globals.css`
- Dark mode ready (can be extended)
- Consistent color scheme (blue primary)

## 📦 Dependencies

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

## 🎯 Next Features to Add

- [ ] Email verification
- [ ] Password reset/recovery
- [ ] Two-factor authentication (2FA)
- [ ] OAuth integration (Google, GitHub)
- [ ] User profile settings
- [ ] Breach monitoring dashboard
- [ ] Password strength checker
- [ ] Dark mode toggle
- [ ] Audit logs
- [ ] Admin panel

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

See [SETUP.md](./SETUP.md) for detailed setup instructions.

## 📄 License

All rights reserved © 2026 BreachBuddy

## 🤝 Support

For issues or questions, contact support@breachbuddy.com

---

**Ready to secure digital identities?** Start with the login page at `/login` or create an account at `/signup`.
