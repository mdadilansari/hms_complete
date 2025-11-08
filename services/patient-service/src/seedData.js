const fs = require('fs');
const path = require('path');
const csv = require('csv-parse');
const db = require('./config/database');
const logger = require('./utils/logger');

const seedPatients = async () => {
  try {
    logger.info('Starting patient data seeding...');
    
    // Read the CSV file
    const csvPath = path.join(__dirname, '../../hms_patients.csv');
    const csvData = fs.readFileSync(csvPath, 'utf8');
    
    // Parse CSV
    const records = [];
    const parser = csv.parse(csvData, {
      columns: true,
      skip_empty_lines: true
    });
    
    for await (const record of parser) {
      records.push(record);
    }
    
    logger.info(`Found ${records.length} patient records to seed`);
    
    // Insert patients
    let insertCount = 0;
    for (const record of records) {
      try {
        await db.query(`
          INSERT INTO patients (patient_id, name, email, phone, dob, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (patient_id) DO NOTHING
        `, [
          record.patient_id,
          record.name,
          record.email,
          record.phone,
          record.dob,
          record.created_at
        ]);
        insertCount++;
      } catch (error) {
        logger.warn(`Failed to insert patient ${record.patient_id}`, { error: error.message });
      }
    }
    
    logger.info(`Successfully seeded ${insertCount} patients`);
    
  } catch (error) {
    logger.error('Error seeding patient data', error);
  } finally {
    await db.end();
    process.exit(0);
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedPatients();
}

module.exports = seedPatients;