// Attention: development-only script. Do not run on production or on a database containing real HR data.
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetDatabase() {
  const client = await pool.connect();
  try {
    console.log('🗑️  Resetting database...');
    
    // Drop all tables in reverse order of dependencies
    await client.query('DROP TABLE IF EXISTS approvals CASCADE');
    await client.query('DROP TABLE IF EXISTS vacation_requests CASCADE');
    await client.query('DROP TABLE IF EXISTS employees CASCADE');
    await client.query('DROP TABLE IF EXISTS vacation_types CASCADE');
    await client.query('DROP TABLE IF EXISTS public_holidays CASCADE');
    await client.query('DROP TABLE IF EXISTS departments CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    
    console.log('✅ Database reset successfully');
    console.log('💡 Run "pnpm run db:setup" to recreate tables');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase();
