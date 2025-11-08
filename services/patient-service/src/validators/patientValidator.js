const Joi = require('joi');
const logger = require('../utils/logger');

// Patient validation schema
const patientSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(255)
    .pattern(/^[a-zA-Z\s\.]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Name should only contain letters, spaces, and dots',
      'string.min': 'Name should be at least 2 characters long',
      'string.max': 'Name should not exceed 255 characters'
    }),
  
  email: Joi.string()
    .email()
    .max(255)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[1-9][\d]{0,15}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone number should be a valid format'
    }),
  
  dob: Joi.date()
    .max('now')
    .min('1900-01-01')
    .required()
    .messages({
      'date.max': 'Date of birth cannot be in the future',
      'date.min': 'Date of birth cannot be before 1900'
    })
});

// Patient update schema (all fields optional)
const patientUpdateSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(255)
    .pattern(/^[a-zA-Z\s\.]+$/)
    .messages({
      'string.pattern.base': 'Name should only contain letters, spaces, and dots',
      'string.min': 'Name should be at least 2 characters long',
      'string.max': 'Name should not exceed 255 characters'
    }),
  
  email: Joi.string()
    .email()
    .max(255)
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[1-9][\d]{0,15}$/)
    .messages({
      'string.pattern.base': 'Phone number should be a valid format'
    }),
  
  dob: Joi.date()
    .max('now')
    .min('1900-01-01')
    .messages({
      'date.max': 'Date of birth cannot be in the future',
      'date.min': 'Date of birth cannot be before 1900'
    })
}).min(1); // At least one field must be provided

// Middleware to validate patient creation
const validatePatient = (req, res, next) => {
  const { error, value } = patientSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    logger.warn('Patient validation failed', {
      correlationId: req.correlationId,
      errors: validationErrors
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: validationErrors,
        correlationId: req.correlationId
      }
    });
  }

  req.body = value;
  next();
};

// Middleware to validate patient update
const validatePatientUpdate = (req, res, next) => {
  const { error, value } = patientUpdateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    logger.warn('Patient update validation failed', {
      correlationId: req.correlationId,
      errors: validationErrors
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: validationErrors,
        correlationId: req.correlationId
      }
    });
  }

  req.body = value;
  next();
};

module.exports = {
  validatePatient,
  validatePatientUpdate,
  patientSchema,
  patientUpdateSchema
};