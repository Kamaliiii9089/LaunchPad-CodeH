const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

/* ===============================
   Import Routes
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
================================ */
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});
app.use('/api/', limiter);

/* ===============================
   CORS Configuration
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
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
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/breach-check', breachCheckRoutes);
app.use('/api/surface', surfaceRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/false-positives', falsePositiveRoutes);

/* ===============================
   Health & Status
================================ */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/* ===============================
   404 Handler
================================ */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    errorCode: 'NOT_FOUND',
    message: `Route ${req.originalUrl} not found`,
  });
});

/* ===============================
   Global Error Handler
================================ */
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  // Handle CSRF errors
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      errorCode: 'CSRF_TOKEN_INVALID',
      message: 'Invalid or missing CSRF token',
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: err.message,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      errorCode: 'INVALID_TOKEN',
      message: 'Invalid token',
    });
  }

  // Default error response
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
    console.log('✅ Connected to MongoDB');
    try {
      await MigrationService.runMigrations();
      console.log('✅ Migrations completed');
    } catch (migrationError) {
      console.warn('⚠️ Migration warning:', migrationError.message);
    }
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  });

/* ===============================
   Server Start
================================ */
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;