const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const correlationId = req.correlationId;
  
  // Log error with correlation ID
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    correlationId,
    path: req.path,
    method: req.method
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
  } else if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    message = 'Resource already exists';
    code = 'DUPLICATE_RESOURCE';
  } else if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Invalid reference';
    code = 'INVALID_REFERENCE';
  } else if (err.name === 'CastError' || err.name === 'TypeError') {
    statusCode = 400;
    message = 'Invalid data format';
    code = 'INVALID_FORMAT';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      correlationId
    }
  });
};

const notFound = (req, res, next) => {
  const correlationId = req.correlationId;
  
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    correlationId
  });

  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
      correlationId
    }
  });
};

module.exports = {
  errorHandler,
  notFound
};