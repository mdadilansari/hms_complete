const winston = require('winston');

const maskPII = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  const masked = { ...obj };
  
  if (masked.email && typeof masked.email === 'string') {
    const [local, domain] = masked.email.split('@');
    if (local && domain) {
      const maskedLocal = local.length > 2 ? local.substring(0, 2) + '*'.repeat(local.length - 2) : '*'.repeat(local.length);
      masked.email = `${maskedLocal}@${domain}`;
    }
  }
  
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

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const logEntry = {
      timestamp, level, message,
      service: process.env.SERVICE_NAME || 'unknown-service',
      correlationId,
      ...maskPII(meta)
    };
    return JSON.stringify(logEntry);
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [new winston.transports.Console()]
});

module.exports = logger;