const { v4: uuidv4 } = require('uuid');

const correlationId = (req, res, next) => {
  // Check if correlation ID is provided in headers
  req.correlationId = req.headers['x-correlation-id'] || req.headers['correlation-id'] || uuidv4();
  
  // Set correlation ID in response headers
  res.setHeader('x-correlation-id', req.correlationId);
  
  next();
};

module.exports = correlationId;