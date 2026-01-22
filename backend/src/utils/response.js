/**
 * Standardized API Response Formatter
 * 
 * Ensures consistent response structure across all endpoints
 */

class ApiResponse {
  /**
   * Success response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {String} message - Success message
   * @param {Number} statusCode - HTTP status code
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Error response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {Number} statusCode - HTTP status code
   * @param {String} code - Error code
   * @param {Object} details - Additional error details
   */
  static error(res, message = 'An error occurred', statusCode = 500, code = 'ERROR', details = {}) {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Created response (201)
   */
  static created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * No content response (204)
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Validation error response (400)
   */
  static validationError(res, errors) {
    return this.error(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors);
  }

  /**
   * Unauthorized response (401)
   */
  static unauthorized(res, message = 'Authentication required') {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  /**
   * Forbidden response (403)
   */
  static forbidden(res, message = 'Access denied') {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  /**
   * Not found response (404)
   */
  static notFound(res, resource = 'Resource') {
    return this.error(res, `${resource} not found`, 404, 'NOT_FOUND');
  }

  /**
   * Conflict response (409)
   */
  static conflict(res, message, details = {}) {
    return this.error(res, message, 409, 'CONFLICT', details);
  }
}

module.exports = ApiResponse;
