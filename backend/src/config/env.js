require('dotenv').config();

/**
 * Environment Configuration Validator
 * 
 * Validates and exports all environment variables
 */

// Required environment variables
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'REDIS_HOST',
  'REDIS_PORT',
  'JWT_SECRET_ADMIN',
  'JWT_SECRET_USER',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD'
];

/**
 * Validate environment variables
 */
function validateEnv() {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    throw new Error('Environment validation failed');
  }
  
  console.log('✅ Environment variables validated');
}

// Validate on module load
validateEnv();

module.exports = {
  // Server
  NODE_ENV: process.env.NODE_ENV,
  PORT: parseInt(process.env.PORT) || 5000,
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI,
  
  // Redis
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: parseInt(process.env.REDIS_PORT) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || null,
  
  // JWT
  JWT_SECRET_ADMIN: process.env.JWT_SECRET_ADMIN,
  JWT_SECRET_USER: process.env.JWT_SECRET_USER,
  JWT_EXPIRY_ADMIN: process.env.JWT_EXPIRY_ADMIN || '24h',
  JWT_EXPIRY_USER: process.env.JWT_EXPIRY_USER || '7d',
  
  // Admin
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  
  // Lock configuration
  LOCK_TTL_SECONDS: parseInt(process.env.LOCK_TTL_SECONDS) || 120,
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  
  // Payment
  PAYMENT_SIMULATION: process.env.PAYMENT_SIMULATION === 'true',
  
  // Helper function
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isProduction: () => process.env.NODE_ENV === 'production'
};
