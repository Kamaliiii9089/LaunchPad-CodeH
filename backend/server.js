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
const securityRoutes = require('./routes/security');
const MigrationService = require('./services/migrationService');

/* ===============================
   App Initialization
================================ */
const app = express();
app.set('trust proxy', true);

/* ===============================
   Security Middleware

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
   Body Parsing
================================ */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ===============================
   Routes
================================ */
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/breach-check', breachCheckRoutes);
app.use('/api/surface', surfaceRoutes);
app.use('/api/security', securityRoutes);

// Health check endpoint - Comprehensive system health status
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    service: 'Gmail Subscription Manager API',
    version: '1.0.0'
  };

  // Check database connectivity
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  healthCheck.database = {
    status: dbStatus[dbState] || 'unknown',
    connected: dbState === 1
  };

  // Check memory usage
  const memUsage = process.memoryUsage();
  healthCheck.memory = {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
  };

  // Rate limiting status
  healthCheck.rateLimiting = {
    enabled: process.env.SKIP_RATE_LIMIT_DEV !== 'true',
    config: {
      authStrict: `${process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 5} req/${(parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 900000) / 60000}min`,
      authModerate: `${process.env.AUTH_MODERATE_MAX_REQUESTS || 50} req/${(parseInt(process.env.AUTH_MODERATE_WINDOW_MS) || 900000) / 60000}min`,
      apiGeneral: `${process.env.API_RATE_LIMIT_MAX_REQUESTS || 100} req/${(parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 900000) / 60000}min`
    }
  };

  // If database is not connected, return 503
  if (dbState !== 1) {
    healthCheck.status = 'DEGRADED';
    return res.status(503).json(healthCheck);
  }

  res.status(200).json(healthCheck);
});

// Detailed health check endpoint (for monitoring systems)
app.get('/health/detailed', async (req, res) => {
  const detailedHealth = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(process.uptime()),
      formatted: new Date(process.uptime() * 1000).toISOString().substr(11, 8)
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      cpuUsage: process.cpuUsage()
    },
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      models: Object.keys(mongoose.connection.models).length
    },
    memory: {
      rss: memoryFormat(process.memoryUsage().rss),
      heapUsed: memoryFormat(process.memoryUsage().heapUsed),
      heapTotal: memoryFormat(process.memoryUsage().heapTotal),
      external: memoryFormat(process.memoryUsage().external)
    },
    security: {
      helmet: 'enabled',
      cors: 'enabled',
      rateLimiting: process.env.SKIP_RATE_LIMIT_DEV !== 'true',
      trustProxy: app.get('trust proxy')
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5000,
      frontendUrl: process.env.FRONTEND_URL || 'not set'
    }
  };

  // Check if all critical services are operational
  const isHealthy = mongoose.connection.readyState === 1;
  
  if (!isHealthy) {
    detailedHealth.status = 'UNHEALTHY';
    return res.status(503).json(detailedHealth);
  }

  res.status(200).json(detailedHealth);
});

// Simple liveness probe (for Kubernetes/Docker)
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Readiness probe (for Kubernetes/Docker)
app.get('/health/ready', (req, res) => {
  const isReady = mongoose.connection.readyState === 1;
  
  if (isReady) {
    res.status(200).json({ 
      status: 'ready', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } else {
    res.status(503).json({ 
      status: 'not ready', 
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

// API status endpoint (backward compatibility)
app.get('/api/status', (req, res) => {
  res.status(200).json({
    message: 'Gmail Subscription Manager API is running',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Helper function to format memory
function memoryFormat(bytes) {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

/* ===============================
   Global Error Handler
   (Fixes HTTP Status Code Misuse)
================================ */
app.use((err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message:
      err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

/* ===============================
   Database Connection
================================ */
mongoose
  .connect(
    process.env.MONGODB_URI ||
      'mongodb://localhost:27017/gmail-subscription-manager',
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
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  });

/* ===============================
   Server Start
================================ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌱 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
