require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    path: process.env.DB_PATH || './data/crm.db'
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    lockTime: parseInt(process.env.LOCK_TIME || '30') * 60 * 1000 // Convert to milliseconds
  },
  
  // Rate Limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:8081'
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

// Validate required configuration
if (config.nodeEnv === 'production') {
  const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    process.exit(1);
  }
}

module.exports = config;