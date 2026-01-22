/**
 * Custom Error Classes
 * 
 * Domain-specific errors with standardized structure
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', details = {}) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied', details = {}) {
    super(message, 403, 'AUTHORIZATION_ERROR', details);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource', details = {}) {
    super(`${resource} not found`, 404, 'NOT_FOUND', details);
  }
}

class ConflictError extends AppError {
  constructor(message, details = {}) {
    super(message, 409, 'CONFLICT', details);
  }
}

class SeatLockError extends AppError {
  constructor(message, details = {}) {
    super(message, 409, 'SEAT_LOCK_ERROR', details);
  }
}

class PaymentError extends AppError {
  constructor(message, details = {}) {
    super(message, 402, 'PAYMENT_ERROR', details);
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  SeatLockError,
  PaymentError
};
