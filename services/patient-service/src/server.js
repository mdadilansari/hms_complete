const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const promMiddleware = require('express-prometheus-middleware');

const logger = require('./utils/logger');
const db = require('./config/database');
const patientRoutes = require('./routes/patients');
const healthRoutes = require('./routes/health');
const docsRoutes = require('./routes/docs');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const correlationId = require('./middleware/correlationId');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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
app.use(correlationId);

// Request logging
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    correlationId: req.correlationId,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  next();
});

// Routes
app.use('/health', healthRoutes);
app.use('/docs', docsRoutes);
app.use('/v1/patients', patientRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Close database connections
  try {
    await db.end();
    logger.info('Database connection closed');
  } catch (err) {
    logger.error('Error closing database connection', err);
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    await db.end();
    logger.info('Database connection closed');
  } catch (err) {
    logger.error('Error closing database connection', err);
  }
  
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Patient Service running on port ${PORT}`, {
    service: 'patient-service',
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = app;