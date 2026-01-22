const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * JWT Token Service
 * 
 * Handles JWT token generation and verification for both admin and user authentication
 */
class TokenService {
  /**
   * Generate admin JWT token
   * @param {Object} payload - Token payload
   * @returns {String} JWT token
   */
  static generateAdminToken(payload) {
    return jwt.sign(
      {
        ...payload,
        type: 'admin',
        iat: Math.floor(Date.now() / 1000)
      },
      env.JWT_SECRET_ADMIN,
      {
        expiresIn: env.JWT_EXPIRY_ADMIN
      }
    );
  }

  /**
   * Generate user JWT token
   * @param {Object} payload - Token payload (should include userId)
   * @returns {String} JWT token
   */
  static generateUserToken(payload) {
    return jwt.sign(
      {
        ...payload,
        type: 'user',
        iat: Math.floor(Date.now() / 1000)
      },
      env.JWT_SECRET_USER,
      {
        expiresIn: env.JWT_EXPIRY_USER
      }
    );
  }

  /**
   * Verify admin JWT token
   * @param {String} token - JWT token
   * @returns {Object} Decoded payload
   * @throws {Error} If token is invalid
   */
  static verifyAdminToken(token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET_ADMIN);
      
      if (decoded.type !== 'admin') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired admin token');
    }
  }

  /**
   * Verify user JWT token
   * @param {String} token - JWT token
   * @returns {Object} Decoded payload
   * @throws {Error} If token is invalid
   */
  static verifyUserToken(token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET_USER);
      
      if (decoded.type !== 'user') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired user token');
    }
  }

  /**
   * Extract token from Authorization header
   * @param {String} authHeader - Authorization header value
   * @returns {String|null} Token or null
   */
  static extractToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

module.exports = TokenService;
