const { execSync } = require('child_process');
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.local') });

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fetchJson(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch(e) { json = { raw: text }; }
  return { status: res.status, body: json };
}

async function run() {
  console.log('1) Reseed database (scripts/seed-db.js)');
  try {
    execSync('node scripts/seed-db.js', { stdio: 'inherit' });
  } catch (e) {
    console.warn('Seed script may have failed or been run before:', e.message);
  }

  // Helper: login
  async function login(email, password) {
    const r = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (r.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(r.body)}`);
    return r.body.token;
  }

  // Promote tsiory to manager to test self-approval
  const client = await pool.connect();
  try {
    await client.query("UPDATE users SET role='manager' WHERE email='tsiory@example.com'");
    console.log('Promoted tsiory@example.com to manager for self-approval test');
  } finally {
    client.release();
  }

  // Wait a bit for DB to settle
  await new Promise(r => setTimeout(r, 500));

  // Test 1: Self-approval prevention
  try {
    const tsioryToken = await login('tsiory@example.com', 'employee123');
    console.log('Logged in as tsiory');

    // Get vacation types to pick an id (annual_leave)
    const vt = await fetchJson('/api/vacation-types', { headers: { Authorization: `Bearer ${tsioryToken}` } });
    const annual = Array.isArray(vt.body) ? vt.body.find(t => t.code === 'annual_leave') : null;
    if (!annual) throw new Error('annual_leave type not found');

    // Create vacation request as tsiory
    const start = new Date();
    start.setDate(start.getDate() + 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const createReq = await fetchJson('/api/vacation-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tsioryToken}` },
      body: JSON.stringify({ vacationTypeId: annual.id, startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] })
    });

    if (createReq.status !== 201) throw new Error('Failed to create vacation request for tsiory: ' + JSON.stringify(createReq.body));
    const vrId = createReq.body.id;
    console.log('Created vacation request id', vrId);

    // Attempt to approve as same user (manager)
    const approveRes = await fetchJson('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tsioryToken}` },
      body: JSON.stringify({ vacationRequestId: vrId, approved: true })
    });

    console.log('Self-approval attempt status:', approveRes.status, 'body:', approveRes.body);
    if (approveRes.status === 403 && approveRes.body.error && approveRes.body.error.includes('You cannot approve your own request')) {
      console.log('✅ Self-approval correctly prevented');
    } else {
      console.error('❌ Self-approval NOT prevented as expected');
    }
  } catch (err) {
    console.error('Test 1 error:', err);
  }

  // Revert tsiory role to employee
  const client2 = await pool.connect();
  try {
    await client2.query("UPDATE users SET role='employee' WHERE email='tsiory@example.com'");
    console.log('Reverted tsiory role to employee');
  } finally { client2.release(); }

  // Test 2: Approval consumption and double approval protection
  try {
    const mialyToken = await login('mialy@example.com', 'employee123');
    const adminToken = await login('admin@example.com', 'admin123');
    console.log('Logged in as mialy and admin');

    // Get vacation types
    const vt = await fetchJson('/api/vacation-types', { headers: { Authorization: `Bearer ${mialyToken}` } });
    const annual = Array.isArray(vt.body) ? vt.body.find(t => t.code === 'annual_leave') : null;
    if (!annual) throw new Error('annual_leave type not found');

    // Check balance before
    const client3 = await pool.connect();
    let beforeBalance = null;
    try {
      const q = `SELECT lb.remaining_days FROM leave_balances lb JOIN employees e ON lb.employee_id = e.id JOIN users u ON e.user_id = u.id JOIN vacation_types vt ON lb.vacation_type_id = vt.id WHERE u.email = $1 AND vt.code = 'annual_leave'`;
      const res = await client3.query(q, ['mialy@example.com']);
      beforeBalance = res.rows[0] ? parseFloat(res.rows[0].remaining_days) : null;
      console.log('Mialy balance before:', beforeBalance);
    } finally { client3.release(); }

    // Create request as mialy
    const start = new Date(); start.setDate(start.getDate() + 14);
    const end = new Date(start); end.setDate(start.getDate() + 1);
    const createReq = await fetchJson('/api/vacation-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mialyToken}` },
      body: JSON.stringify({ vacationTypeId: annual.id, startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] })
    });
    if (createReq.status !== 201) throw new Error('Failed to create vacation request for mialy: ' + JSON.stringify(createReq.body));
    const vrId = createReq.body.id;
    console.log('Created vacation request id', vrId, 'for mialy');

    // Approve as admin
    const approveRes = await fetchJson('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ vacationRequestId: vrId, approved: true })
    });
    console.log('Admin approve status:', approveRes.status, approveRes.body.error ? approveRes.body.error : 'ok');

    // Check balance after
    const client4 = await pool.connect();
    let afterBalance = null;
    try {
      const q = `SELECT lb.remaining_days FROM leave_balances lb JOIN employees e ON lb.employee_id = e.id JOIN users u ON e.user_id = u.id JOIN vacation_types vt ON lb.vacation_type_id = vt.id WHERE u.email = $1 AND vt.code = 'annual_leave'`;
      const res = await client4.query(q, ['mialy@example.com']);
      afterBalance = res.rows[0] ? parseFloat(res.rows[0].remaining_days) : null;
      console.log('Mialy balance after:', afterBalance);
    } finally { client4.release(); }

    if (beforeBalance !== null && afterBalance !== null && afterBalance < beforeBalance) {
      console.log('✅ Balance consumed on approval');
    } else {
      console.error('❌ Balance not consumed as expected');
    }

    // Try double-approve (should fail because not pending)
    const doubleApprove = await fetchJson('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ vacationRequestId: vrId, approved: true })
    });
    console.log('Double approve response:', doubleApprove.status, doubleApprove.body);
    if (doubleApprove.status !== 201) {
      console.log('✅ Double-approve prevented');
    } else {
      console.error('❌ Double-approve succeeded unexpectedly');
    }

  } catch (err) {
    console.error('Test 2 error:', err);
  }

  console.log('\nAutomated tests finished.');
  await pool.end();
}

run().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
