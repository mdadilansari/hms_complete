const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const correlationId = req.correlationId;
  
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    correlationId,
    path: req.path,
    method: req.method
  });

  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
  }

  res.status(statusCode).json({
    success: false,
    error: { code, message, correlationId }
  });
};

const notFound = (req, res, next) => {
  const correlationId = req.correlationId;
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
      correlationId
    }
  });
};

module.exports = { errorHandler, notFound };