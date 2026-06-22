const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspect() {
  const client = await pool.connect();
  try {
    console.log('Tables overview:');
    const tables = ['leave_balances', 'vacation_types', 'users', 'employees'];
    for (const t of tables) {
      const cols = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [t]
      ).catch(()=>null);
      console.log('\nTable:', t);
      if (!cols || cols.rows.length===0) {
        console.log('  (not found)');
        continue;
      }
      cols.rows.forEach(c=> console.log('  ', c.column_name, c.data_type));

      // show small sample
      const sample = await client.query(`SELECT * FROM ${t} LIMIT 5`).catch(()=>null);
      if (sample && sample.rows) console.log('  sample row:', sample.rows[0]);
    }

    // Also show vacation_types codes
    const vt = await client.query("SELECT id, code, name FROM vacation_types ORDER BY id");
    console.log('\nVacation types:');
    console.table(vt.rows);
  } catch (e) {
    console.error('Inspect error:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

inspect();
