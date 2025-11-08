const express = require('express');
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

module.exports = router;