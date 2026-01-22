const User = require('../models/User');
const TokenService = require('../services/tokenService');
const { AuthenticationError } = require('../utils/errors');

/**
 * User Authentication Middleware (Layer 3)
 * 
 * Validates user JWT token
 * Requires app authentication to be already done (req.app should exist)
 */
async function userAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = TokenService.extractToken(authHeader);

    if (!token) {
      throw new AuthenticationError('User authentication token required');
    }

    // Verify user token
    const decoded = TokenService.verifyUserToken(token);

    // Verify user exists and is active
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (!user.isActive) {
      throw new AuthenticationError('User account is inactive');
    }

    // Attach user info to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name
    };

    next();
  } catch (error) {
    if (error.isOperational) {
      next(error);
    } else {
      next(new AuthenticationError(error.message));
    }
  }
}

/**
 * Optional user authentication (doesn't fail if no token)
 * Useful for endpoints that have different behavior for authenticated users
 */
async function optionalUserAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = TokenService.extractToken(authHeader);

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = TokenService.verifyUserToken(token);
    const user = await User.findById(decoded.userId);

    if (user && user.isActive) {
      req.user = {
        id: user._id.toString(),
        email: user.email,
        name: user.name
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
}

module.exports = {
  userAuth,
  optionalUserAuth
};
