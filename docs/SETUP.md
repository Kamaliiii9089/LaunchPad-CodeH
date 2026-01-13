# BreachBuddy - Setup Guide

## Prerequisites

Before setting up BreachBuddy, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v8.0.0 or higher) - Comes with Node.js
- **MongoDB** (v5.0 or higher) - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **Git** - [Download](https://git-scm.com/downloads)
- **Google Cloud Account** - For Gmail API access
- **HIBP API Key** - For breach checking (optional but recommended)

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/LaunchPad-CodeH.git
cd LaunchPad-CodeH
```

### 2. Install Dependencies

#### Root Level (Frontend)
```bash
npm install
```

#### Backend
```bash
cd backend
npm install
cd ..
```

### 3. MongoDB Setup

#### Option A: Local MongoDB

1. Install MongoDB Community Edition
2. Start MongoDB service:

**Windows:**
```bash
net start MongoDB
```

**macOS/Linux:**
```bash
sudo systemctl start mongod
```

3. Verify MongoDB is running:
```bash
mongosh
```

#### Option B: MongoDB Atlas (Cloud)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (Free tier available)
3. Create a database user:
   - Database Access → Add New Database User
   - Set username and password
4. Whitelist your IP:
   - Network Access → Add IP Address
   - Add your current IP or `0.0.0.0/0` for development
5. Get connection string:
   - Clusters → Connect → Connect Your Application
   - Copy the connection string
   - Replace `<password>` with your database user password

### 4. Google OAuth 2.0 Setup

#### Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name (e.g., "BreachBuddy") → Create

#### Enable Gmail API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click on it and press "Enable"

#### Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External
   - App name: BreachBuddy
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `gmail.readonly` scope
   - Test users: Add your Gmail address
4. Back to "Create OAuth client ID":
   - Application type: Web application
   - Name: BreachBuddy Web Client
   - Authorized JavaScript origins:
     ```
     http://localhost:5173
     http://localhost:5000
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:5000/api/auth/google/callback
     ```
5. Click "Create"
6. Copy the Client ID and Client Secret

### 5. Have I Been Pwned API Key (Optional)

1. Visit [HIBP API Key Purchase](https://haveibeenpwned.com/API/Key)
2. Purchase an API key ($3.50/month as of 2024)
3. Receive API key via email
4. Copy the API key for configuration

### 6. Environment Configuration

#### Backend Environment Variables

Create `.env` file in the `backend` directory:

```bash
cd backend
touch .env    # or create manually
```

Add the following configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
# For local MongoDB:
MONGODB_URI=mongodb://localhost:27017/gmail-subscription-manager

# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/breachbuddy?retryWrites=true&w=majority

# JWT Secret (Generate a secure random string)
# You can generate one using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_secure_jwt_secret_minimum_32_characters_long

# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Have I Been Pwned API Configuration
# Get your API key from: https://haveibeenpwned.com/API/Key
HIBP_API_KEY=your_hibp_api_key_here

# Hugging Face API (Optional - for future AI features)
HUGGING_FACE_API_KEY=your_hugging_face_token_here

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

#### Generate JWT Secret

Run this command to generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and use it as your `JWT_SECRET`.

### 7. Verify Configuration

Check that all required environment variables are set:

```bash
# In backend directory
cat .env  # Linux/Mac
type .env # Windows
```

Ensure you have:
- ✅ MONGODB_URI (with correct credentials if using Atlas)
- ✅ JWT_SECRET (at least 32 characters)
- ✅ GOOGLE_CLIENT_ID
- ✅ GOOGLE_CLIENT_SECRET
- ✅ GOOGLE_REDIRECT_URI
- ⚠️ HIBP_API_KEY (optional but recommended)

### 8. Start the Application

#### Terminal 1: Start Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
✓ MongoDB Connected Successfully
✓ Server running on port 5000
```

#### Terminal 2: Start Frontend Dev Server

Open a new terminal:

```bash
npm run dev
```

You should see:
```
VITE v7.x.x ready in xxx ms
➜  Local:   http://localhost:5173/
```

### 9. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

You should see the BreachBuddy landing page.

### 10. Test the Setup

#### Test Authentication

1. Click "Get Started" or "Login"
2. Try signing up with email/password
3. Try "Sign in with Google"
4. Verify you're redirected to the dashboard

#### Test Gmail Scanning

1. From dashboard, authenticate with Gmail
2. Click "Deep Scan Emails"
3. Wait for scan to complete
4. Verify subscriptions appear

#### Test Breach Checking

1. Navigate to "Security Check"
2. Wait for breach status to load
3. Verify breach information displays

## Troubleshooting

### MongoDB Connection Issues

**Error: `MongoServerError: Authentication failed`**

Solution:
- Verify username and password in connection string
- For Atlas: Check that IP is whitelisted
- Ensure database user has proper permissions

**Error: `MongooseServerSelectionError`**

Solution:
- Check MongoDB service is running: `mongosh`
- For Atlas: Verify connection string format
- Check network connectivity

### Google OAuth Issues

**Error: `redirect_uri_mismatch`**

Solution:
- Verify `GOOGLE_REDIRECT_URI` matches exactly what's in Google Cloud Console
- Check authorized redirect URIs include: `http://localhost:5000/api/auth/google/callback`
- Remove trailing slashes

**Error: `access_denied` or `consent_required`**

Solution:
- Add your email to test users in OAuth consent screen
- Verify Gmail API is enabled
- Check OAuth scopes include `gmail.readonly`

### Port Already in Use

**Error: `EADDRINUSE: address already in use :::5000`**

Solution:

**Windows:**
```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**Linux/Mac:**
```bash
lsof -i :5000
kill -9 <PID>
```

### HIBP API Issues

**Error: `401 Unauthorized`**

Solution:
- Verify API key is correct
- Check API key hasn't expired
- Ensure proper headers are being sent

### Frontend Build Issues

**Error: `Cannot find module 'vite'`**

Solution:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

After successful setup:

1. ✅ Review the [User Guide](./USER_GUIDE.md)
2. ✅ Check [API Documentation](./API.md)
3. ✅ Explore [Development Guide](./DEVELOPMENT.md)
4. ✅ Configure production deployment (see [Deployment Guide](./DEPLOYMENT.md))

## Getting Help

If you encounter issues:

1. Check the [FAQ](./FAQ.md)
2. Search existing [GitHub Issues](https://github.com/yourusername/LaunchPad-CodeH/issues)
3. Create a new issue with:
   - Detailed error description
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)
   - Error logs

## Security Notes

⚠️ **Important Security Reminders:**

- Never commit `.env` files to version control
- Use strong, unique JWT secrets
- Regularly rotate API keys
- Keep dependencies updated
- Use environment-specific configurations
- Enable rate limiting in production
- Use HTTPS in production

## Video Tutorial

📺 Watch our setup video guide: [Coming Soon]

---

Setup complete! You're now ready to use BreachBuddy. 🎉
