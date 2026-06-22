const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM users WHERE email IN ('admin@example.com','tsiory@example.com','mialy@example.com')");
    console.log('Deleted demo users if existed');
  } catch (e) {
    console.error('Clean error:', e);
  } finally {
    client.release();
    await pool.end();
  }
})();
