const express = require('express');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const router = express.Router();

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HMS Patient Service API',
      version: '1.0.0',
      description: 'Hospital Management System - Patient Service API Documentation'
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        Patient: {
          type: 'object',
          required: ['name', 'email', 'phone', 'dob'],
          properties: {
            patient_id: {
              type: 'integer',
              description: 'Auto-generated patient ID'
            },
            name: {
              type: 'string',
              description: 'Patient full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Patient email address'
            },
            phone: {
              type: 'string',
              description: 'Patient phone number'
            },
            dob: {
              type: 'string',
              format: 'date',
              description: 'Date of birth'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            },
            is_active: {
              type: 'boolean',
              description: 'Active status'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string'
                },
                message: {
                  type: 'string'
                },
                correlationId: {
                  type: 'string'
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const specs = swaggerJsDoc(swaggerOptions);

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs));

module.exports = router;