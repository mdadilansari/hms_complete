const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'doctor_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  logger.info('Connected to doctor database');
});

pool.on('error', (err) => {
  logger.error('Database connection error', err);
  process.exit(-1);
});

// Initialize database tables
const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    
    // Create doctors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        doctor_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        department VARCHAR(100) NOT NULL,
        specialization VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        max_daily_appointments INTEGER DEFAULT 20
      )
    `);

    // Create doctor schedules table (for availability)
    await client.query(`
      CREATE TABLE IF NOT EXISTS doctor_schedules (
        schedule_id SERIAL PRIMARY KEY,
        doctor_id INTEGER REFERENCES doctors(doctor_id),
        day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        slot_duration INTEGER DEFAULT 30,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(doctor_id, day_of_week, start_time, end_time)
      )
    `);

    // Create doctor availability overrides (for specific dates)
    await client.query(`
      CREATE TABLE IF NOT EXISTS doctor_availability_overrides (
        override_id SERIAL PRIMARY KEY,
        doctor_id INTEGER REFERENCES doctors(doctor_id),
        date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        is_available BOOLEAN NOT NULL,
        reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(doctor_id, date)
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_doctors_department ON doctors(department);
      CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON doctors(specialization);
      CREATE INDEX IF NOT EXISTS idx_doctors_active ON doctors(is_active);
      CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor ON doctor_schedules(doctor_id);
      CREATE INDEX IF NOT EXISTS idx_doctor_schedules_day ON doctor_schedules(day_of_week);
      CREATE INDEX IF NOT EXISTS idx_availability_overrides_doctor ON doctor_availability_overrides(doctor_id);
      CREATE INDEX IF NOT EXISTS idx_availability_overrides_date ON doctor_availability_overrides(date);
    `);

    // Create updated_at trigger
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_doctors_updated_at ON doctors;
      CREATE TRIGGER update_doctors_updated_at 
        BEFORE UPDATE ON doctors 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    client.release();
    logger.info('Doctor database initialized successfully');
  } catch (err) {
    logger.error('Failed to initialize doctor database', err);
    throw err;
  }
};

// Initialize on startup
initializeDatabase();

module.exports = pool;