import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import bcryptjs from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await query(`
      SELECT 
        e.id,
        e.user_id,
        e.employee_id,
        e.position,
        e.hired_date,
        e.is_active,
        e.total_vacation_days,
        e.used_vacation_days,
        u.full_name,
        u.email,
        u.is_active as user_active,
        d.id as department_id,
        d.name as department,
        d.code as department_code
      FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN departments d ON e.department_id = d.id
      WHERE e.is_active = true
      ORDER BY u.full_name
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const client = await getClient();

  try {
    const user = await verifyAuth(req);
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json(
        { error: 'Only admins or managers can create employees' },
        { status: 403 }
      );
    }

    const {
      employeeCode,
      firstName,
      lastName,
      email,
      password,
      departmentId,
      position,
      hireDate,
    } = await req.json();

    // Validate required fields
    if (
      !employeeCode ||
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !departmentId ||
      !position ||
      !hireDate
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: employeeCode, firstName, lastName, email, password, departmentId, position, hireDate',
        },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    try {
      // Check if email already exists
      const emailExists = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (emailExists.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: `Email ${email} is already in use` },
          { status: 409 }
        );
      }

      // Check if employee code already exists
      const codeExists = await client.query(
        'SELECT id FROM employees WHERE employee_id = $1',
        [employeeCode]
      );

      if (codeExists.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: `Employee code ${employeeCode} is already in use` },
          { status: 409 }
        );
      }

      // Verify department exists
      const deptResult = await client.query(
        'SELECT id FROM departments WHERE id = $1',
        [departmentId]
      );

      if (deptResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Department not found' },
          { status: 404 }
        );
      }

      // Create user
      const fullName = `${firstName} ${lastName}`;
      const hashedPassword = await bcryptjs.hash(password, 10);

      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, email, full_name, role`,
        [email, hashedPassword, fullName, 'employee']
      );

      const userId = userResult.rows[0].id;

      // Create employee record
      const employeeResult = await client.query(
        `INSERT INTO employees (user_id, employee_id, department_id, position, hired_date, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING *`,
        [userId, employeeCode, departmentId, position, hireDate]
      );

      const employeeId = employeeResult.rows[0].id;

      // Initialize leave balances for current year
      const currentYear = new Date().getFullYear();

      // Get all vacation types
      const typesResult = await client.query(
        'SELECT id, code FROM vacation_types'
      );

      const DEFAULT_QUOTAS: Record<string, number> = {
        annual_leave: 22,
        annual_leave_half: 0,
        sick_leave: 10.98,
        permission: 10.98,
        unpaid_leave: 0,
        maternity_leave: 0,
      };

      for (const vacationType of typesResult.rows) {
        const quota = DEFAULT_QUOTAS[vacationType.code] || 0;

        await client.query(
          `INSERT INTO leave_balances (employee_id, vacation_type_id, year, annual_quota, accrued_days, used_days, remaining_days)
           VALUES ($1, $2, $3, $4, 0, 0, $4)
           ON CONFLICT (employee_id, vacation_type_id, year) DO NOTHING`,
          [employeeId, vacationType.id, currentYear, quota]
        );
      }

      await client.query('COMMIT');

      // Fetch full employee details
      const fullEmployeeResult = await client.query(
        `SELECT 
          e.id,
          e.user_id,
          e.employee_id,
          e.position,
          e.hired_date,
          e.is_active,
          u.full_name,
          u.email,
          d.name as department,
          d.code as department_code
         FROM employees e
         JOIN users u ON e.user_id = u.id
         JOIN departments d ON e.department_id = d.id
         WHERE e.id = $1`,
        [employeeId]
      );

      return NextResponse.json(fullEmployeeResult.rows[0], { status: 201 });
    } catch (innerError) {
      await client.query('ROLLBACK');
      throw innerError;
    }
  } catch (error) {
    console.error('Create employee error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
