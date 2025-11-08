const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is unhealthy
 */
router.get('/', async (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    service: 'patient-service',
    version: process.env.npm_package_version || '1.0.0'
  };

  try {
    // Check database connection
    await db.query('SELECT 1');
    healthCheck.database = 'connected';
    
    res.status(200).json({
      success: true,
      data: healthCheck
    });
  } catch (error) {
    healthCheck.database = 'disconnected';
    healthCheck.message = 'Database connection failed';
    
    res.status(503).json({
      success: false,
      data: healthCheck
    });
  }
});

module.exports = router;