const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/response');

/**
 * Validation Middleware
 * 
 * Checks express-validator results and formats errors
 */
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    return ApiResponse.validationError(res, formattedErrors);
  }

  next();
}

module.exports = { validate };
