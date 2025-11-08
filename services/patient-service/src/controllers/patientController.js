const db = require('../config/database');
const logger = require('../utils/logger');

const patientController = {
  // Get all patients with pagination and filtering
  getAllPatients: async (req, res, next) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        active = 'true' 
      } = req.query;

      const offset = (page - 1) * limit;
      let query = `
        SELECT patient_id, name, email, phone, dob, created_at, updated_at, is_active
        FROM patients 
        WHERE ($3::text = '' OR (name ILIKE $3 OR phone ILIKE $3))
          AND ($4::boolean IS NULL OR is_active = $4)
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM patients 
        WHERE ($1::text = '' OR (name ILIKE $1 OR phone ILIKE $1))
          AND ($2::boolean IS NULL OR is_active = $2)
      `;

      const searchPattern = `%${search}%`;
      const activeFilter = active === 'all' ? null : active === 'true';

      const [patients, countResult] = await Promise.all([
        db.query(query, [limit, offset, searchPattern, activeFilter]),
        db.query(countQuery, [searchPattern, activeFilter])
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      logger.info('Patients retrieved', {
        correlationId: req.correlationId,
        count: patients.rows.length,
        total,
        page,
        limit
      });

      res.json({
        success: true,
        data: {
          patients: patients.rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalRecords: total,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get patient by ID
  getPatientById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const query = `
        SELECT patient_id, name, email, phone, dob, created_at, updated_at, is_active
        FROM patients 
        WHERE patient_id = $1
      `;

      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PATIENT_NOT_FOUND',
            message: 'Patient not found',
            correlationId: req.correlationId
          }
        });
      }

      logger.info('Patient retrieved', {
        correlationId: req.correlationId,
        patientId: id
      });

      res.json({
        success: true,
        data: {
          patient: result.rows[0]
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Create new patient
  createPatient: async (req, res, next) => {
    try {
      const { name, email, phone, dob } = req.body;

      const query = `
        INSERT INTO patients (name, email, phone, dob)
        VALUES ($1, $2, $3, $4)
        RETURNING patient_id, name, email, phone, dob, created_at, updated_at, is_active
      `;

      const result = await db.query(query, [name, email, phone, dob]);
      const patient = result.rows[0];

      logger.info('Patient created', {
        correlationId: req.correlationId,
        patientId: patient.patient_id,
        email: patient.email
      });

      res.status(201).json({
        success: true,
        data: {
          patient
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Update patient
  updatePatient: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Build dynamic update query
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(key => {
        if (['name', 'email', 'phone', 'dob'].includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          values.push(updates[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FIELDS_TO_UPDATE',
            message: 'No valid fields provided for update',
            correlationId: req.correlationId
          }
        });
      }

      values.push(id); // Add ID as last parameter

      const query = `
        UPDATE patients 
        SET ${fields.join(', ')}
        WHERE patient_id = $${paramCount} AND is_active = true
        RETURNING patient_id, name, email, phone, dob, created_at, updated_at, is_active
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PATIENT_NOT_FOUND',
            message: 'Patient not found or inactive',
            correlationId: req.correlationId
          }
        });
      }

      logger.info('Patient updated', {
        correlationId: req.correlationId,
        patientId: id,
        updatedFields: Object.keys(updates)
      });

      res.json({
        success: true,
        data: {
          patient: result.rows[0]
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Soft delete patient (deactivate)
  deletePatient: async (req, res, next) => {
    try {
      const { id } = req.params;

      const query = `
        UPDATE patients 
        SET is_active = false
        WHERE patient_id = $1 AND is_active = true
        RETURNING patient_id
      `;

      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PATIENT_NOT_FOUND',
            message: 'Patient not found or already inactive',
            correlationId: req.correlationId
          }
        });
      }

      logger.info('Patient deactivated', {
        correlationId: req.correlationId,
        patientId: id
      });

      res.json({
        success: true,
        message: 'Patient deactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Search patients
  searchPatients: async (req, res, next) => {
    try {
      const { q: searchTerm, limit = 10 } = req.query;

      if (!searchTerm || searchTerm.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'SEARCH_TERM_REQUIRED',
            message: 'Search term is required',
            correlationId: req.correlationId
          }
        });
      }

      const query = `
        SELECT patient_id, name, email, phone, dob, created_at
        FROM patients 
        WHERE is_active = true 
          AND (name ILIKE $1 OR phone ILIKE $1)
        ORDER BY 
          CASE WHEN name ILIKE $2 THEN 1 ELSE 2 END,
          name
        LIMIT $3
      `;

      const searchPattern = `%${searchTerm}%`;
      const exactPattern = `${searchTerm}%`;

      const result = await db.query(query, [searchPattern, exactPattern, limit]);

      logger.info('Patient search performed', {
        correlationId: req.correlationId,
        searchTerm,
        resultsCount: result.rows.length
      });

      res.json({
        success: true,
        data: {
          patients: result.rows,
          searchTerm,
          count: result.rows.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = patientController;