const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const database = require('./config/database');
const redisConnection = require('./config/redis');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const Logger = require('./utils/logger');

// Import routes
const adminRoutes = require('./routes/admin.routes');
const authRoutes = require('./routes/auth.routes');
const bookingRoutes = require('./routes/booking.routes');

/**
 * Initialize Express Application
 */
const app = express();

/**
 * Security Middleware
 */
app.use(helmet());

/**
 * CORS Configuration
 */
const corsOptions = {
  origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

/**
 * Body Parsers
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Request Logging
 */
app.use((req, res, next) => {
  Logger.request(req);
  next();
});

/**
 * Health Check Endpoint
 */
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    services: {
      mongodb: database.getConnectionStatus() ? 'connected' : 'disconnected',
      redis: redisConnection.isReady() ? 'connected' : 'disconnected'
    }
  };

  const httpStatus = health.services.mongodb && health.services.redis ? 200 : 503;

  res.status(httpStatus).json(health);
});

/**
 * API Version Info
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Unified Booking Backend',
    version: '1.0.0',
    description: 'Multi-tenant booking backend for Event, Bus, and Movie booking systems',
    endpoints: {
      health: '/health',
      admin: '/admin/*',
      auth: '/auth/*',
      booking: '/*'
    },
    documentation: 'See ARCHITECTURE.md for detailed documentation'
  });
});

/**
 * Mount Routes
 */
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/', bookingRoutes);

/**
 * 404 Handler
 */
app.use(notFoundHandler);

/**
 * Error Handler (must be last)
 */
app.use(errorHandler);

/**
 * Server Startup
 */
async function startServer() {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 UNIFIED BOOKING BACKEND - STARTING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await database.connect();

    // Connect to Redis
    console.log('📦 Connecting to Redis...');
    await redisConnection.connect();

    // Start Express server
    const PORT = env.PORT;
    app.listen(PORT, () => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Environment: ${env.NODE_ENV}`);
      console.log(`✅ Health check: http://localhost:${PORT}/health`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📚 API Endpoints:');
      console.log(`   Admin:   http://localhost:${PORT}/admin/*`);
      console.log(`   Auth:    http://localhost:${PORT}/auth/*`);
      console.log(`   Booking: http://localhost:${PORT}/*`);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔐 Authentication Layers:');
      console.log('   Layer 1: Admin Auth (JWT from /admin/login)');
      console.log('   Layer 2: App Auth (x-app-id, x-api-key headers)');
      console.log('   Layer 3: User Auth (JWT from /auth/login)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('ℹ️  Admin Credentials (from .env):');
      console.log(`   Email: ${env.ADMIN_EMAIL}`);
      console.log(`   Password: ${env.ADMIN_PASSWORD}`);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful Shutdown
 */
process.on('SIGTERM', async () => {
  console.log('\n⚠️  SIGTERM received, shutting down gracefully...');
  await database.disconnect();
  await redisConnection.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT received, shutting down gracefully...');
  await database.disconnect();
  await redisConnection.disconnect();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
