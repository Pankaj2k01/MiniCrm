const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const database = require('./models/database');

// Import routes
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const leadRoutes = require('./routes/leads');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware
app.use(compression());

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// Trust proxy for proper IP addresses
app.set('trust proxy', 1);

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.maxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(globalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Mini CRM API is healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/leads', leadRoutes);

// Placeholder for other routes
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Mini CRM API v1.0',
    endpoints: [
      'GET /health - Health check',
      'GET /api - API information',
      'POST /api/auth/login - User login',
      'POST /api/auth/register - User registration',
      'POST /api/auth/refresh-token - Refresh access token',
      'POST /api/auth/logout - User logout',
      'GET /api/auth/profile - Get user profile',
      'GET /api/customers - Get customers (RBAC protected)',
      'GET /api/customers/:id - Get customer by ID',
      'POST /api/customers - Create customer',
      'PUT /api/customers/:id - Update customer',
      'DELETE /api/customers/:id - Delete customer'
    ],
    documentation: 'See README.md for full API documentation'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);

  // Don't leak error details in production
  const isDevelopment = config.nodeEnv === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(isDevelopment && { 
      stack: error.stack,
      details: error.details 
    })
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\\n🛑 ${signal} received. Starting graceful shutdown...`);
  
  try {
    // Close database connection
    await database.close();
    console.log('✅ Database connection closed');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Initialize database
    await database.initialize();
    
    // Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(`\\n🚀 Mini CRM API Server started successfully!`);
      console.log(`📍 Environment: ${config.nodeEnv}`);
      console.log(`🌐 Server running on port: ${config.port}`);
      console.log(`🔗 API Base URL: http://localhost:${config.port}/api`);
      console.log(`💚 Health Check: http://localhost:${config.port}/health`);
      console.log(`📚 API Info: http://localhost:${config.port}/api\\n`);
      
      if (config.nodeEnv === 'development') {
        console.log('🔧 Development mode - detailed logging enabled');
        console.log('🔐 CORS origin:', config.cors.origin);
        console.log('📊 Rate limit: 100 requests per 15 minutes per IP\\n');
      }
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${config.port} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;