const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
require('dotenv').config();

/* ===============================
   Import Routes (Unversioned)
================================ */
const authRoutes = require('./routes/auth');
const auth2faRoutes = require('./routes/auth2fa');
const dashboardRoutes = require('./routes/dashboard');
const emailRoutes = require('./routes/emails');
const subscriptionRoutes = require('./routes/subscriptions');
const breachCheckRoutes = require('./routes/breachCheck');
const surfaceRoutes = require('./routes/surface');
const activityRoutes = require('./routes/activity');
const reportRoutes = require('./routes/reports');
const falsePositiveRoutes = require('./routes/falsePositives');
const MigrationService = require('./services/migrationService');

const app = express();
app.set('trust proxy', true);

/* ===============================
   Security Middleware

/* ===============================
   CORS Configuration
   (credentials required for CSRF cookies)
================================ */
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  })
);

/* ===============================
   Body & Cookie Parsing
================================ */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ===============================
   CSRF Protection Setup
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
});

/**
 * CSRF Token Endpoint
 * Frontend must call this once and store token
 */
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.status(200).json({
    csrfToken: req.csrfToken(),
  });
});

/* ===============================
   Apply CSRF Protection
   (Only to authenticated / API routes)
   Exclude public authentication endpoints
/* ===============================
   API ROUTES (UNVERSIONED, WORKING)
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/breach-check', breachCheckRoutes);
app.use('/api/surface', surfaceRoutes);

/* ===============================
   Health & Status
});

/* ===============================
   404 Handler
  });
});

/* ===============================
   Global Error Handler
================================ */
app.use((err, req, res, next) => {
  console.error(err);

  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      errorCode: 'CSRF_TOKEN_INVALID',
      message: 'Invalid or missing CSRF token',
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    errorCode: err.errorCode || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Internal Server Error',
  });
});

/* ===============================
   Database Connection
================================ */
mongoose
  .connect(
    process.env.MONGODB_URI ||
      'mongodb://localhost:27017/gmail-subscription-manager'
  )
  .then(async () => {
    console.log('Connected to MongoDB');
    await MigrationService.runMigrations();
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  });

/* ===============================
   Server Start
================================ */
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
// adding 