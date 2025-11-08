const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const promMiddleware = require('express-prometheus-middleware');

const logger = require('./utils/logger');
const db = require('./config/database');
const appointmentRoutes = require('./routes/appointments');
const healthRoutes = require('./routes/health');
const docsRoutes = require('./routes/docs');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const correlationId = require('./middleware/correlationId');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(helmet());
app.use(cors());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(promMiddleware({ metricsPath: '/metrics', collectDefaultMetrics: true }));
app.use(express.json({ limit: '10mb' }));
app.use(correlationId);

// Routes
app.use('/health', healthRoutes);
app.use('/docs', docsRoutes);
app.use('/v1/appointments', appointmentRoutes);
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Appointment Service running on port ${PORT}`);
});

module.exports = app;