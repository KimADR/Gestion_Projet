const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migratEmployees() {
  const client = await pool.connect();
  try {
    console.log('🔄 Migrating employees table...');

    // Check if column exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'is_active'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('⏳ Adding is_active column...');
      await client.query(`
        ALTER TABLE employees ADD COLUMN is_active BOOLEAN DEFAULT true
      `);
      console.log('✅ is_active column added');
    } else {
      console.log('ℹ️  is_active column already exists');
    }

    console.log('✅ Migration completed');
  } catch (error) {
    console.error('❌ Error migrating employees:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migratEmployees();
