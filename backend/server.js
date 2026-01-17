const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
require('dotenv').config();

const app = express(); // ✅ ONLY ONCE

/* ===============================
   TRUST PROXY (IMPORTANT)
================================ */
app.set('trust proxy', false); // ✅ correct for local/dev

/* ===============================
   Import Routes
================================ */
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const emailRoutes = require('./routes/emails');
const subscriptionRoutes = require('./routes/subscriptions');
const breachCheckRoutes = require('./routes/breachCheck');
const surfaceRoutes = require('./routes/surface');
const apiLimiter = require('./middleware/rateLimiter');
const MigrationService = require('./services/migrationService');

/* ===============================
   Security Middleware
================================ */
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

/* ===============================
   CORS
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
   Body & Cookies
================================ */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ===============================
   Rate Limiting (ONCE)
================================ */
app.use('/api', apiLimiter);

/* ===============================
   CSRF Protection
================================ */
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
});

/* ===============================
   API Routes
================================ */
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/breach-check', breachCheckRoutes);
app.use('/api/surface', surfaceRoutes);

/* ===============================
   Health Check
================================ */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API working fine' });
});


/* ===============================
   404 Handler
================================ */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    errorCode: 'ROUTE_NOT_FOUND',
    message: `Route ${req.originalUrl} not found`,
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
   Database
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
