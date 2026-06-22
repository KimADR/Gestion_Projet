const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    console.log('Altering leave_balances...');
    await client.query("ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS annual_quota DECIMAL(10,2) DEFAULT 0;");
    await client.query("ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS remaining_days DECIMAL(10,2) DEFAULT 0;");
    console.log('Done');
  } catch (e) {
    console.error('Alter error:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
