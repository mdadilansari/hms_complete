const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const promMiddleware = require('express-prometheus-middleware');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Metrics middleware
app.use(promMiddleware({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5, 10],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Correlation ID middleware
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || req.headers['correlation-id'] || uuidv4();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
});

// Request logging
app.use((req, res, next) => {
  logger.info('Gateway request', {
    method: req.method,
    path: req.path,
    correlationId: req.correlationId,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  next();
});

// Service URLs
const services = {
  patient: process.env.PATIENT_SERVICE_URL || 'http://localhost:3001',
  doctor: process.env.DOCTOR_SERVICE_URL || 'http://localhost:3002',
  appointment: process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003',
  billing: process.env.BILLING_SERVICE_URL || 'http://localhost:3004',
  prescription: process.env.PRESCRIPTION_SERVICE_URL || 'http://localhost:3005',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007'
};

// Proxy configuration
const createProxy = (target, pathRewrite = {}) => createProxyMiddleware({
  target,
  changeOrigin: true,
  pathRewrite,
  onProxyReq: (proxyReq, req, res) => {
    // Forward correlation ID
    proxyReq.setHeader('x-correlation-id', req.correlationId);
    
    // Log proxy request
    logger.info('Proxying request', {
      originalUrl: req.originalUrl,
      target: target,
      correlationId: req.correlationId
    });
  },
  onError: (err, req, res) => {
    logger.error('Proxy error', {
      error: err.message,
      url: req.url,
      correlationId: req.correlationId
    });
    
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable',
        correlationId: req.correlationId
      }
    });
  }
});

// Route proxies
app.use('/v1/patients', createProxy(services.patient, { '^/v1/patients': '/v1/patients' }));
app.use('/v1/doctors', createProxy(services.doctor, { '^/v1/doctors': '/v1/doctors' }));
app.use('/v1/schedules', createProxy(services.doctor, { '^/v1/schedules': '/v1/schedules' }));
app.use('/v1/appointments', createProxy(services.appointment, { '^/v1/appointments': '/v1/appointments' }));
app.use('/v1/bills', createProxy(services.billing, { '^/v1/bills': '/v1/bills' }));
app.use('/v1/prescriptions', createProxy(services.prescription, { '^/v1/prescriptions': '/v1/prescriptions' }));
app.use('/v1/payments', createProxy(services.payment, { '^/v1/payments': '/v1/payments' }));
app.use('/v1/notifications', createProxy(services.notification, { '^/v1/notifications': '/v1/notifications' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    service: 'api-gateway',
    version: '1.0.0'
  };

  // Check service availability
  const serviceHealth = {};
  
  // For now, assume services are healthy if URLs are configured
  Object.entries(services).forEach(([name, url]) => {
    serviceHealth[name] = url ? 'configured' : 'not configured';
  });

  healthCheck.services = serviceHealth;

  res.status(200).json({
    success: true,
    data: healthCheck
  });
});

// API Documentation endpoint
app.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'HMS API Gateway',
    version: '1.0.0',
    endpoints: {
      patients: '/v1/patients',
      doctors: '/v1/doctors',
      schedules: '/v1/schedules',
      appointments: '/v1/appointments',
      bills: '/v1/bills',
      prescriptions: '/v1/prescriptions',
      payments: '/v1/payments',
      notifications: '/v1/notifications'
    },
    documentation: {
      patients: services.patient + '/docs',
      doctors: services.doctor + '/docs',
      appointments: services.appointment + '/docs',
      billing: services.billing + '/docs',
      prescriptions: services.prescription + '/docs',
      payments: services.payment + '/docs',
      notifications: services.notification + '/docs'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      correlationId: req.correlationId
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Gateway error', {
    error: err.message,
    stack: err.stack,
    correlationId: req.correlationId,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      correlationId: req.correlationId
    }
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`, {
    service: 'api-gateway',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    services: services
  });
});

module.exports = app;