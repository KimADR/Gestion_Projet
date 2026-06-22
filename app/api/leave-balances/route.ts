import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get('year');
    const employeeIdParam = searchParams.get('employeeId');
    const employeeCodeParam = searchParams.get('employeeCode');
    const year = yearParam ? Number(yearParam) : new Date().getFullYear();

    let employeeId: number | null = null;

    if (user.role === 'admin' || user.role === 'manager') {
      if (employeeIdParam) {
        employeeId = Number(employeeIdParam);
        if (Number.isNaN(employeeId)) {
          return NextResponse.json({ error: 'Invalid employeeId parameter' }, { status: 400 });
        }
      } else if (employeeCodeParam) {
        const employeeCodeResult = await query(
          'SELECT id FROM employees WHERE employee_id = $1',
          [employeeCodeParam]
        );

        if (employeeCodeResult.rows.length === 0) {
          return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        employeeId = employeeCodeResult.rows[0].id;
      }
    }

    if (!employeeId) {
      const employeeResult = await query(
        'SELECT id FROM employees WHERE user_id = $1',
        [user.userId]
      );

      if (employeeResult.rows.length === 0) {
        return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
      }

      employeeId = employeeResult.rows[0].id;
    }

    const result = await query(
      `SELECT
         lb.id,
         lb.employee_id,
         lb.vacation_type_id,
         vt.name as vacation_type,
         vt.code as vacation_type_code,
         lb.year,
         lb.annual_quota,
         lb.accrued_days,
         lb.used_days,
         lb.remaining_days,
         lb.created_at,
         lb.updated_at
       FROM leave_balances lb
       JOIN vacation_types vt ON lb.vacation_type_id = vt.id
       WHERE lb.employee_id = $1
         AND lb.year = $2
       ORDER BY vt.display_order, vt.name`,
      [employeeId, year]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Get leave balances error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
