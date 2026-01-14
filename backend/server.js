const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'development') {
      const ip = req.ip || req.connection.remoteAddress;
      return (
        ip === '127.0.0.1' ||
        ip === '::1' ||
        ip?.startsWith('192.168.') ||
        ip?.startsWith('10.') ||
        ip?.startsWith('172.')
      );
    }
    return false;
  },
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  }
});
app.use(limiter);

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
