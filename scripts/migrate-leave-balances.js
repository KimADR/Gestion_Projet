const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DEFAULT_QUOTAS = {
  annual_leave: 22, // Congé annuel complet
  annual_leave_half: 0, // Demi-journée (ne consomme pas de quota)
  sick_leave: 10.98, // Repos maladie
  permission: 10.98, // Permission
  unpaid_leave: 0, // Non-payé (illimité)
  maternity_leave: 0, // Maternité (spécial)
};

async function migrateLeaveBalances() {
  const client = await pool.connect();
  try {
    console.log('🔄 Migrating leave balances...');

    // Get current year
    const currentYear = new Date().getFullYear();

    // Get all employees
    const employeesResult = await client.query('SELECT id FROM employees');
    const employees = employeesResult.rows;

    console.log(`📊 Found ${employees.length} employees`);

    // Get all vacation types
    const typesResult = await client.query('SELECT id, code FROM vacation_types');
    const vacationTypes = typesResult.rows;

    console.log(`📋 Found ${vacationTypes.length} vacation types`);

    let insertedCount = 0;
    let skippedCount = 0;

    // For each employee and vacation type combination
    for (const employee of employees) {
      for (const vacationType of vacationTypes) {
        const quota = DEFAULT_QUOTAS[vacationType.code] || 0;

        // Check if balance already exists
        const existingBalance = await client.query(
          `SELECT id FROM leave_balances 
           WHERE employee_id = $1 AND vacation_type_id = $2 AND year = $3`,
          [employee.id, vacationType.id, currentYear]
        );

        if (existingBalance.rows.length > 0) {
          skippedCount++;
          continue;
        }

        // Insert new balance
        await client.query(
          `INSERT INTO leave_balances 
           (employee_id, vacation_type_id, year, annual_quota, used_days, remaining_days)
           VALUES ($1, $2, $3, $4, 0, $4)`,
          [employee.id, vacationType.id, currentYear, quota]
        );

        insertedCount++;
      }
    }

    console.log(`✅ Migration complete!`);
    console.log(`   - Inserted: ${insertedCount} leave balance records`);
    console.log(`   - Skipped: ${skippedCount} existing records`);

  } catch (error) {
    console.error('❌ Error migrating leave balances:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateLeaveBalances();
