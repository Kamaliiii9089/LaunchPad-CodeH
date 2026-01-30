# BreachBuddy - Setup Guide

## Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (free tier available at https://www.mongodb.com/cloud/atlas)
- npm or yarn

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Mongoose (MongoDB ODM)
- bcryptjs (password hashing)
- jsonwebtoken (JWT authentication)

### 2. MongoDB Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account or sign in
3. Create a new cluster (choose free tier)
4. Wait for the cluster to be ready (5-10 minutes)
5. Click "Connect" and select "Connect your application"
6. Copy the connection string
7. Replace `<password>` with your MongoDB password in the connection string

### 3. Environment Configuration

Update `.env.local` with your MongoDB connection string:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/breachbuddy?retryWrites=true&w=majority
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-this-in-production
JWT_SECRET=your-jwt-secret-key-change-this-in-production
```

**Important**: 
- For production, generate secure random strings for `NEXTAUTH_SECRET` and `JWT_SECRET`
- Never commit `.env.local` to version control

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Features Implemented

### Authentication System
- **Sign Up** (`/signup`) - Create new user accounts
- **Login** (`/login`) - Authenticate existing users
- **Dashboard** (`/dashboard`) - Protected user dashboard
- **Logout** - Clear session and logout

### Backend API Routes

#### `/api/auth/signup` (POST)
Create a new user account
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### `/api/auth/login` (POST)
Login with existing credentials
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### `/api/auth/verify` (GET)
Verify JWT token
- Requires Authorization header: `Bearer <token>`

### Security Features
- ✅ Password hashing with bcryptjs
- ✅ JWT-based authentication
- ✅ Token stored in localStorage (frontend)
- ✅ Route protection middleware
- ✅ Input validation
- ✅ MongoDB unique indexes for emails
- ✅ Automatic password field selection

### Database Schema

**User Collection**
```typescript
{
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  createdAt: Date,
  updatedAt: Date
}
```

## Project Structure

```
.
├── app/                          # Next.js app router
│   ├── api/
│   │   └── auth/
│   │       ├── signup/route.ts   # Sign up endpoint
│   │       ├── login/route.ts    # Login endpoint
│   │       └── verify/route.ts   # Verify token endpoint
│   ├── dashboard/page.tsx        # User dashboard
│   ├── login/page.tsx           # Login page
│   ├── signup/page.tsx          # Sign up page
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── components/                   # React components
│   ├── Navigation.tsx
│   ├── Footer.tsx
│   ├── HeroSection.tsx
│   ├── FeaturesSection.tsx
│   ├── AboutSection.tsx
│   └── CTASection.tsx
├── lib/                         # Utility functions
│   ├── mongodb.ts              # MongoDB connection
│   ├── auth.ts                 # Auth utilities & token generation
│   └── useAuth.ts              # Auth hook for frontend
├── models/                      # Mongoose models
│   └── User.ts                 # User schema
├── middleware.ts                # Request middleware for route protection
├── .env.local                   # Environment variables
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## Testing the Application

### Test Sign Up
1. Go to [http://localhost:3000/signup](http://localhost:3000/signup)
2. Fill in the form with:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
3. Click "Create Account"
4. Should redirect to dashboard on success

### Test Login
1. Go to [http://localhost:3000/login](http://localhost:3000/login)
2. Enter your credentials
3. Click "Sign In"
4. Should redirect to dashboard

### Test Protected Routes
1. Try accessing `/dashboard` without logging in
2. Should redirect to login page

## Build for Production

```bash
npm run build
npm start
```

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `NEXTAUTH_URL` | Application URL | `https://yourdomain.com` |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js | Any random string |
| `JWT_SECRET` | Secret for JWT signing | Any random string |

## Common Issues & Solutions

### MongoDB Connection Failing
- Check `.env.local` has correct connection string
- Verify IP whitelist in MongoDB Atlas (add 0.0.0.0/0 for development)
- Check password has no special characters (URL encode if needed)

### Port 3000 Already in Use
```bash
npm run dev -- -p 3001
```

### Clear Node Modules
```bash
rm -r node_modules
npm install
```

## Next Steps

1. Customize the dashboard with your security features
2. Add more user fields (phone, date of birth, etc.)
3. Implement password reset functionality
4. Add email verification
5. Implement two-factor authentication
6. Add audit logging

## Support & Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Mongoose Documentation](https://mongoosejs.com)
- [MongoDB Atlas](https://docs.atlas.mongodb.com/)
- [JWT.io](https://jwt.io)
