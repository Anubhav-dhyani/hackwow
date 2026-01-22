const bcrypt = require('bcryptjs');
const env = require('../config/env');
const TokenService = require('../services/tokenService');
const { AuthenticationError } = require('../utils/errors');

/**
 * Admin Authentication Middleware (Layer 1)
 * 
 * Validates admin JWT token
 * Admin credentials are stored in .env (not in database)
 */
async function adminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = TokenService.extractToken(authHeader);

    if (!token) {
      throw new AuthenticationError('Admin token required');
    }

    // Verify admin token
    const decoded = TokenService.verifyAdminToken(token);

    // Attach admin info to request
    req.admin = {
      email: decoded.email,
      type: 'admin'
    };

    next();
  } catch (error) {
    next(new AuthenticationError(error.message));
  }
}

/**
 * Admin login helper
 * @param {String} identifier - Admin email or username
 * @param {String} password - Admin password
 * @returns {String} JWT token
 */
async function adminLogin(identifier, password) {
  // Verify credentials against .env (check both username and email)
  const validUsername = env.ADMIN_USERNAME || 'admin';
  const validEmail = env.ADMIN_EMAIL;
  
  if (identifier !== validUsername && identifier !== validEmail) {
    throw new AuthenticationError('Invalid admin credentials');
  }

  // For development, we'll do a simple comparison
  // In production, store hashed admin password in .env
  const isPasswordValid = password === env.ADMIN_PASSWORD;

  if (!isPasswordValid) {
    throw new AuthenticationError('Invalid admin credentials');
  }

  // Generate JWT token
  const token = TokenService.generateAdminToken({
    email: env.ADMIN_EMAIL,
    role: 'admin'
  });

  return token;
}

module.exports = {
  adminAuth,
  adminLogin
};
