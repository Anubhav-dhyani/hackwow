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

/**
 * External User Authentication Middleware (SaaS Mode)
 * 
 * For client apps that manage their own users (like Bus Ticketing System).
 * Allows apps to pass user info in request body or headers instead of requiring
 * users to be registered in Hackwow.
 * 
 * Priority:
 * 1. If Authorization header with valid Hackwow token → use Hackwow user
 * 2. If x-external-user-id header → use external user info
 * 3. If externalUser in request body → use that
 * 
 * Requires: App authentication (req.app must exist)
 */
async function externalUserAuth(req, res, next) {
  try {
    // First, try standard Hackwow token auth
    const authHeader = req.headers.authorization;
    const token = TokenService.extractToken(authHeader);

    if (token) {
      try {
        const decoded = TokenService.verifyUserToken(token);
        const user = await User.findById(decoded.userId);

        if (user && user.isActive) {
          req.user = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            isExternal: false
          };
          return next();
        }
      } catch (tokenError) {
        // Token invalid, try external user auth below
      }
    }

    // Try external user from headers (set by client backend)
    const externalUserId = req.headers['x-external-user-id'];
    const externalUserEmail = req.headers['x-external-user-email'];
    const externalUserName = req.headers['x-external-user-name'];

    if (externalUserId) {
      req.user = {
        id: `ext_${req.app.appId}_${externalUserId}`,
        externalId: externalUserId,
        email: externalUserEmail || `user_${externalUserId}@external`,
        name: externalUserName || `User ${externalUserId}`,
        isExternal: true,
        appId: req.app.appId
      };
      return next();
    }

    // Try external user from request body
    const { externalUser, userId, userEmail, userName } = req.body;

    if (externalUser) {
      req.user = {
        id: `ext_${req.app.appId}_${externalUser.id || externalUser.userId}`,
        externalId: externalUser.id || externalUser.userId,
        email: externalUser.email || `user@external`,
        name: externalUser.name || 'External User',
        isExternal: true,
        appId: req.app.appId
      };
      return next();
    }

    if (userId) {
      req.user = {
        id: `ext_${req.app.appId}_${userId}`,
        externalId: userId,
        email: userEmail || `user_${userId}@external`,
        name: userName || `User ${userId}`,
        isExternal: true,
        appId: req.app.appId
      };
      return next();
    }

    // No user info provided
    throw new AuthenticationError('User identification required. Provide Authorization header, x-external-user-id header, or userId in request body.');

  } catch (error) {
    if (error.isOperational) {
      next(error);
    } else {
      next(new AuthenticationError(error.message));
    }
  }
}

module.exports = {
  userAuth,
  optionalUserAuth,
  externalUserAuth
};
