#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Utility function to create directories
function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Utility function to create files
function createFile(filePath, content) {
  createDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
  console.log(`Created file: ${filePath}`);
}

const serviceTemplates = {
  // Appointment Service
  appointmentService: {
    'package.json': `{
  "name": "appointment-service",
  "version": "1.0.0",
  "description": "HMS Appointment Service - Booking, rescheduling, cancellation",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest",
    "seed": "node src/seedData.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "express-rate-limit": "^6.7.0",
    "helmet": "^6.1.5",
    "cors": "^2.8.5",
    "pg": "^8.11.0",
    "joi": "^17.9.2",
    "winston": "^3.8.2",
    "swagger-ui-express": "^4.6.3",
    "swagger-jsdoc": "^6.2.8",
    "uuid": "^9.0.0",
    "moment": "^2.29.4",
    "axios": "^1.4.0",
    "prom-client": "^14.2.0",
    "express-prometheus-middleware": "^1.2.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "csv-parse": "^5.4.0"
  }
}`,
    'Dockerfile': `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN addgroup -g 1001 -S nodejs && adduser -S hms -u 1001
RUN chown -R hms:nodejs /app
USER hms
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
EXPOSE 3000
CMD ["npm", "start"]`,
    'init.sql': `-- Appointment Service Database
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    department VARCHAR(100) NOT NULL,
    slot_start TIMESTAMP NOT NULL,
    slot_end TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reschedule_count INTEGER DEFAULT 0,
    notes TEXT,
    version INTEGER DEFAULT 1
);

-- Patient read model (replicated data)
CREATE TABLE IF NOT EXISTS appointment_patient_cache (
    patient_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctor read model (replicated data)
CREATE TABLE IF NOT EXISTS appointment_doctor_cache (
    doctor_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments(slot_start, slot_end);
CREATE INDEX IF NOT EXISTS idx_appointments_department ON appointments(department);`,
    'src/server.js': `const express = require('express');
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
  logger.info(\`Appointment Service running on port \${PORT}\`);
});

module.exports = app;`
  },

  // Billing Service
  billingService: {
    'package.json': `{
  "name": "billing-service",
  "version": "1.0.0",
  "description": "HMS Billing Service - Bill generation, tax computation",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest",
    "seed": "node src/seedData.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "express-rate-limit": "^6.7.0",
    "helmet": "^6.1.5",
    "cors": "^2.8.5",
    "pg": "^8.11.0",
    "joi": "^17.9.2",
    "winston": "^3.8.2",
    "swagger-ui-express": "^4.6.3",
    "swagger-jsdoc": "^6.2.8",
    "uuid": "^9.0.0",
    "axios": "^1.4.0",
    "prom-client": "^14.2.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.5.0",
    "csv-parse": "^5.4.0"
  }
}`,
    'init.sql': `-- Billing Service Database
CREATE TABLE IF NOT EXISTS bills (
    bill_id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    appointment_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PAID', 'VOID', 'REFUNDED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS bill_line_items (
    line_item_id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(bill_id),
    description VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bills_patient ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_appointment ON bills(appointment_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_line_items(bill_id);`
  },

  // Prescription Service
  prescriptionService: {
    'package.json': `{
  "name": "prescription-service",
  "version": "1.0.0",
  "description": "HMS Prescription Service - Prescription management",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest",
    "seed": "node src/seedData.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "express-rate-limit": "^6.7.0",
    "helmet": "^6.1.5",
    "cors": "^2.8.5",
    "pg": "^8.11.0",
    "joi": "^17.9.2",
    "winston": "^3.8.2",
    "swagger-ui-express": "^4.6.3",
    "swagger-jsdoc": "^6.2.8",
    "uuid": "^9.0.0",
    "axios": "^1.4.0",
    "prom-client": "^14.2.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.5.0",
    "csv-parse": "^5.4.0"
  }
}`,
    'init.sql': `-- Prescription Service Database
CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    medication VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    days INTEGER NOT NULL,
    instructions TEXT,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment ON prescriptions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);`
  },

  // Payment Service
  paymentService: {
    'package.json': `{
  "name": "payment-service",
  "version": "1.0.0",
  "description": "HMS Payment Service - Payment processing with idempotency",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest",
    "seed": "node src/seedData.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "express-rate-limit": "^6.7.0",
    "helmet": "^6.1.5",
    "cors": "^2.8.5",
    "pg": "^8.11.0",
    "joi": "^17.9.2",
    "winston": "^3.8.2",
    "swagger-ui-express": "^4.6.3",
    "swagger-jsdoc": "^6.2.8",
    "uuid": "^9.0.0",
    "axios": "^1.4.0",
    "prom-client": "^14.2.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.5.0",
    "csv-parse": "^5.4.0"
  }
}`,
    'init.sql': `-- Payment Service Database
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    method VARCHAR(20) NOT NULL CHECK (method IN ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER')),
    reference VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    idempotency_key VARCHAR(255) UNIQUE,
    gateway_response JSONB,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS refunds (
    refund_id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES payments(payment_id),
    amount DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON payments(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds(payment_id);`
  },

  // Notification Service
  notificationService: {
    'package.json': `{
  "name": "notification-service",
  "version": "1.0.0",
  "description": "HMS Notification Service - SMS/Email reminders and alerts",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "express-rate-limit": "^6.7.0",
    "helmet": "^6.1.5",
    "cors": "^2.8.5",
    "pg": "^8.11.0",
    "joi": "^17.9.2",
    "winston": "^3.8.2",
    "swagger-ui-express": "^4.6.3",
    "swagger-jsdoc": "^6.2.8",
    "uuid": "^9.0.0",
    "nodemailer": "^6.9.0",
    "prom-client": "^14.2.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.5.0"
  }
}`,
    'init.sql': `-- Notification Service Database
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('PATIENT', 'DOCTOR', 'ADMIN')),
    recipient_id INTEGER NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('EMAIL', 'SMS', 'PUSH')),
    template_name VARCHAR(100) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'CANCELLED')),
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    retry_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notification_templates (
    template_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    channel VARCHAR(20) NOT NULL,
    subject_template VARCHAR(255),
    body_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_at);`
  }
};

// Create common utilities that will be shared
const commonUtils = {
  'utils/logger.js': `const winston = require('winston');

const maskPII = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  const masked = { ...obj };
  
  if (masked.email && typeof masked.email === 'string') {
    const [local, domain] = masked.email.split('@');
    if (local && domain) {
      const maskedLocal = local.length > 2 ? local.substring(0, 2) + '*'.repeat(local.length - 2) : '*'.repeat(local.length);
      masked.email = \`\${maskedLocal}@\${domain}\`;
    }
  }
  
  if (masked.phone && typeof masked.phone === 'string') {
    const phone = masked.phone.replace(/\\D/g, '');
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

module.exports = logger;`,

  'middleware/correlationId.js': `const { v4: uuidv4 } = require('uuid');

const correlationId = (req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || req.headers['correlation-id'] || uuidv4();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
};

module.exports = correlationId;`,

  'middleware/errorHandler.js': `const logger = require('../utils/logger');

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

module.exports = { errorHandler, notFound };`,

  'routes/health.js': `const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    service: process.env.SERVICE_NAME || 'unknown-service',
    version: '1.0.0'
  };

  try {
    await db.query('SELECT 1');
    healthCheck.database = 'connected';
    res.status(200).json({ success: true, data: healthCheck });
  } catch (error) {
    healthCheck.database = 'disconnected';
    healthCheck.message = 'Database connection failed';
    res.status(503).json({ success: false, data: healthCheck });
  }
});

module.exports = router;`
};

// Generate all services
function generateAllServices() {
  const servicesDir = './services';
  
  Object.entries(serviceTemplates).forEach(([serviceName, files]) => {
    const serviceDir = path.join(servicesDir, serviceName.replace('Service', '-service'));
    
    // Create service files
    Object.entries(files).forEach(([fileName, content]) => {
      createFile(path.join(serviceDir, fileName), content);
    });
    
    // Create common utilities for each service
    Object.entries(commonUtils).forEach(([fileName, content]) => {
      createFile(path.join(serviceDir, 'src', fileName), content);
    });
  });
  
  console.log('\\nAll services generated successfully!');
  console.log('\\nNext steps:');
  console.log('1. Run: docker-compose up -d');
  console.log('2. Check health: curl http://localhost:3001/health');
  console.log('3. Visit API docs: http://localhost:3001/docs');
}

// Run the generator
generateAllServices();