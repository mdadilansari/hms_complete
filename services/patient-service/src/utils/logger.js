const winston = require('winston');

// PII masking function
const maskPII = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const masked = { ...obj };
  
  // Mask email
  if (masked.email && typeof masked.email === 'string') {
    const [local, domain] = masked.email.split('@');
    if (local && domain) {
      const maskedLocal = local.length > 2 
        ? local.substring(0, 2) + '*'.repeat(local.length - 2)
        : '*'.repeat(local.length);
      masked.email = `${maskedLocal}@${domain}`;
    }
  }
  
  // Mask phone
  if (masked.phone && typeof masked.phone === 'string') {
    const phone = masked.phone.replace(/\D/g, '');
    if (phone.length >= 4) {
      masked.phone = '*'.repeat(phone.length - 4) + phone.slice(-4);
    } else {
      masked.phone = '*'.repeat(phone.length);
    }
  }
  
  return masked;
};

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      service: 'patient-service',
      correlationId,
      ...maskPII(meta)
    };
    
    return JSON.stringify(logEntry);
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Override console methods in production
if (process.env.NODE_ENV === 'production') {
  console.log = (...args) => logger.info(args.join(' '));
  console.error = (...args) => logger.error(args.join(' '));
  console.warn = (...args) => logger.warn(args.join(' '));
}

module.exports = logger;