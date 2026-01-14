const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { apiGeneralLimiter } = require('./middleware/rateLimiter');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const emailRoutes = require('./routes/emails');
const subscriptionRoutes = require('./routes/subscriptions');
const breachCheckRoutes = require('./routes/breachCheck');
const surfaceRoutes = require('./routes/surface');
const MigrationService = require('./services/migrationService');

/* 🔽 ADDED for Global Error Handling */
const AppError = require('./errors/AppError');
const globalErrorHandler = require('./middleware/errorHandler');
/* 🔼 ADDED */

const app = express();

// Trust proxy configuration
// This is critical for rate limiting to work correctly behind proxies/load balancers
// Set to true for development, or specify the number of trusted proxies in production
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// General API rate limiting - applied to all routes
// Specific authentication routes have their own stricter rate limiting
app.use(apiGeneralLimiter);

// CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Preflight
app.options('*', cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/breach-check', breachCheckRoutes);
app.use('/api/surface', surfaceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: 'enabled'
  });
});

// API status
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Gmail Subscription Manager API is running',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

/* 🔽 ADDED: Proper 404 forwarding to global error handler */
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});
/* 🔼 ADDED */

/* 🔽 EXISTING error middleware (unchanged) */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});
/* 🔼 EXISTING */

/* 🔽 ADDED: Centralized Global Error Handler (FINAL) */
app.use(globalErrorHandler);
/* 🔼 ADDED */

// Database connection
mongoose.connect(
  process.env.MONGODB_URI || 'mongodb://localhost:27017/gmail-subscription-manager',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
)
.then(async () => {
  console.log('Connected to MongoDB');
  await MigrationService.runMigrations();
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
