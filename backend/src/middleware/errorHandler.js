const ApiResponse = require('../utils/response');
const Logger = require('../utils/logger');

/**
 * Centralized Error Handler
 * 
 * Catches all errors and formats them consistently
 */
function errorHandler(err, req, res, next) {
  // Log error
  Logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  // Operational errors (known errors)
  if (err.isOperational) {
    return ApiResponse.error(
      res,
      err.message,
      err.statusCode,
      err.code,
      err.details
    );
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return ApiResponse.validationError(res, errors);
  }

  // Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    return ApiResponse.error(
      res,
      'Invalid ID format',
      400,
      'INVALID_ID'
    );
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return ApiResponse.error(
      res,
      `${field} already exists`,
      409,
      'DUPLICATE_KEY',
      { field }
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token expired');
  }

  // Default to 500 server error
  return ApiResponse.error(
    res,
    process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    500,
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}
  );
}

/**
 * 404 Not Found Handler
 */
function notFoundHandler(req, res) {
  return ApiResponse.notFound(res, 'Endpoint');
}

/**
 * Async handler wrapper (catches async errors)
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
