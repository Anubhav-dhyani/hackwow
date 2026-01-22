const bcrypt = require('bcryptjs');
const App = require('../models/App');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const Logger = require('../utils/logger');

/**
 * App Authentication Middleware (Layer 2 - Multi-Tenant)
 * 
 * Validates app credentials and domain restrictions
 * This is the CORE of multi-tenancy
 */
async function appAuth(req, res, next) {
  try {
    // Extract app credentials from headers
    const appId = req.headers['x-app-id'];
    const apiKey = req.headers['x-api-key'];
    const origin = req.headers['origin'] || req.headers['referer'];

    // Validate presence of credentials
    if (!appId || !apiKey) {
      throw new AuthenticationError('App credentials required (x-app-id, x-api-key)');
    }

    // Find app in database
    const app = await App.findOne({ appId, isActive: true });

    if (!app) {
      Logger.warn('App authentication failed: app not found or inactive', { appId });
      throw new AuthenticationError('Invalid app credentials or app is inactive');
    }

    // Verify API key (bcrypt comparison)
    const isApiKeyValid = await bcrypt.compare(apiKey, app.apiKeyHash);

    if (!isApiKeyValid) {
      Logger.warn('App authentication failed: invalid API key', { appId });
      throw new AuthenticationError('Invalid app credentials');
    }

    // Validate origin domain (if provided and if allowedDomains is set)
    if (app.allowedDomains && app.allowedDomains.length > 0 && origin) {
      const isOriginAllowed = app.allowedDomains.some(allowedDomain => {
        // Support exact match and wildcard subdomains
        if (allowedDomain === '*') return true;
        
        // Convert to URL for proper comparison
        try {
          const originUrl = new URL(origin);
          const originHostname = originUrl.hostname;
          
          // Check exact match
          if (allowedDomain === originHostname) return true;
          if (allowedDomain === origin) return true;
          
          // Check if allowedDomain is in origin
          if (origin.includes(allowedDomain)) return true;
          
          return false;
        } catch (error) {
          return false;
        }
      });

      if (!isOriginAllowed) {
        Logger.warn('App authentication failed: origin not whitelisted', {
          appId,
          origin,
          allowedDomains: app.allowedDomains
        });
        throw new AuthorizationError('Origin domain not authorized for this app');
      }
    }

    // Attach app context to request
    req.app = {
      id: app._id,
      appId: app.appId,
      name: app.name,
      domain: app.domain
    };

    Logger.debug('App authenticated successfully', {
      appId: app.appId,
      domain: app.domain
    });

    next();
  } catch (error) {
    if (error.isOperational) {
      next(error);
    } else {
      Logger.error('App authentication error', { error: error.message });
      next(new AuthenticationError('App authentication failed'));
    }
  }
}

/**
 * Optional: Domain-specific authorization
 * Use this to restrict certain endpoints to specific domains
 */
function requireDomain(...allowedDomains) {
  return (req, res, next) => {
    if (!req.app) {
      return next(new AuthenticationError('App context not found'));
    }

    if (!allowedDomains.includes(req.app.domain)) {
      return next(new AuthorizationError(`This endpoint is only available for ${allowedDomains.join(', ')} apps`));
    }

    next();
  };
}

module.exports = {
  appAuth,
  requireDomain
};
