const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedDatabase() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database with demo data...');

    // Create demo admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    const userRes = await client.query(
      'INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id',
      ['admin@example.com', passwordHash, 'Admin User', 'admin']
    );
    const adminUserId = userRes.rows[0].id;

    // Create demo employee users
    const employee1Hash = await bcrypt.hash('employee123', 10);
    const empRes1 = await client.query(
      'INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id',
      ['tsiory@example.com', employee1Hash, 'Tsiory', 'employee']
    );
    const emp1UserId = empRes1.rows[0].id;

    const employee2Hash = await bcrypt.hash('employee123', 10);
    const empRes2 = await client.query(
      'INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id',
      ['mialy@example.com', employee2Hash, 'Mialy', 'employee']
    );
    const emp2UserId = empRes2.rows[0].id;

    // Get department IDs
    const deptRes = await client.query('SELECT id, code FROM departments');
    const depts = {};
    deptRes.rows.forEach(d => {
      depts[d.code] = d.id;
    });

    // Create employee records
    const emp1Res = await client.query(
      'INSERT INTO employees (user_id, employee_id, department_id, position, hired_date, total_vacation_days) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [emp1UserId, 'TEK004', depts['NORD'], 'Directrice Qualité et Opération', '2022-01-15', 25]
    );

    const emp2Res = await client.query(
      'INSERT INTO employees (user_id, employee_id, department_id, position, hired_date, total_vacation_days) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [emp2UserId, 'TEK002', depts['SUD'], 'Gestionnaire Administratif et Logistique', '2021-06-01', 25]
    );

    const emp1Id = emp1Res.rows[0].id;
    const emp2Id = emp2Res.rows[0].id;

    // Initialize leave balances for created employees (at least annual_leave, sick_leave, permission)
    const currentYear = new Date().getFullYear();
    const typesRes = await client.query(
      "SELECT id, code FROM vacation_types WHERE code IN ('annual_leave','sick_leave','permission')"
    );
    const typeMap = {};
    typesRes.rows.forEach(t => { typeMap[t.code] = t.id; });

    const DEFAULT_QUOTAS = {
      annual_leave: 22,
      sick_leave: 10.98,
      permission: 10.98,
    };

    for (const employeeId of [emp1Id, emp2Id]) {
      for (const code of Object.keys(DEFAULT_QUOTAS)) {
        const typeId = typeMap[code];
        if (!typeId) continue;
        const quota = DEFAULT_QUOTAS[code];
        await client.query(
          `INSERT INTO leave_balances (employee_id, vacation_type_id, year, annual_quota, accrued_days, used_days, remaining_days)
           VALUES ($1, $2, $3, $4, 0, 0, $4)
           ON CONFLICT (employee_id, vacation_type_id, year) DO NOTHING`,
          [employeeId, typeId, currentYear, quota]
        );
      }
    }

    console.log('✅ Demo data seeded successfully!');
    console.log('\n📝 Demo Credentials:');
    console.log('   Admin:');
    console.log('   - Email: admin@example.com');
    console.log('   - Password: admin123');
    console.log('\n   Employee 1:');
    console.log('   - Email: tsiory@example.com');
    console.log('   - Password: employee123');
    console.log('\n   Employee 2:');
    console.log('   - Email: mialy@example.com');
    console.log('   - Password: employee123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
