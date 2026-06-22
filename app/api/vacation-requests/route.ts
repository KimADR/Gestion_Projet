import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasEnoughBalance, initializeAllLeaveBalances } from '@/lib/leave-balance';
import { 
  calculateLeaveDuration, 
  validateLeaveDuration,
  getPublicHolidaysForYear 
} from '@/lib/leave-duration';

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');

    const where: any = {};

    if (user.role === 'employee') {
      where.employee = {
        user_id: user.userId,
      };
    }

    if (status) {
      where.status = status;
    }

    if (employeeId) {
      where.employee = {
        ...(where.employee || {}),
        employee_id: employeeId,
      };
    }

    const vacationRequests = await prisma.vacationRequest.findMany({
      where,
      select: {
        id: true,
        employee_id: true,
        start_date: true,
        end_date: true,
        days_requested: true,
        reason: true,
        status: true,
        created_at: true,
        employee: {
          select: {
            employee_id: true,
            user: {
              select: {
                full_name: true,
              },
            },
          },
        },
        vacationType: {
          select: {
            name: true,
            color: true,
            excel_code: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json(
      vacationRequests.map((request) => ({
        id: request.id,
        employee_id: request.employee_id,
        start_date: request.start_date,
        end_date: request.end_date,
        duration_days: Number(request.days_requested),
        reason: request.reason,
        status: request.status,
        created_at: request.created_at,
        full_name: request.employee.user.full_name,
        vacation_type: request.vacationType.name,
        color: request.vacationType.color,
        excel_code: request.vacationType.excel_code,
        employee_code: request.employee.employee_id,
      }))
    );
  } catch (error) {
    console.error('Get vacation requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Accept new format: startDate, endDate, halfDayType (no daysRequested from client)
    const { vacationTypeId, startDate, endDate, halfDayType = 'none', reason } = await req.json();

    // Validate input
    if (!vacationTypeId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: vacationTypeId, startDate, endDate' },
        { status: 400 }
      );
    }

    // Get employee ID from user
    const empResult = await query(
      'SELECT id FROM employees WHERE user_id = $1',
      [user.userId]
    );

    if (empResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Employee record not found' },
        { status: 404 }
      );
    }

    const employeeId = empResult.rows[0].id;

    // Use the year of the start date for balance calculations
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start.getFullYear() !== end.getFullYear()) {
      return NextResponse.json(
        { error: 'Start date and end date must be within the same year for now' },
        { status: 400 }
      );
    }

    const year = start.getFullYear();

    // Get vacation type to verify it exists
    const typeResult = await query(
      'SELECT code FROM vacation_types WHERE id = $1',
      [vacationTypeId]
    );

    if (typeResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vacation type not found' },
        { status: 404 }
      );
    }

    const leaveTypeCode = typeResult.rows[0].code;

    if (leaveTypeCode === 'annual_leave_half') {
      return NextResponse.json(
        { error: 'Use annual leave with a half-day option instead of the separate half-day type' },
        { status: 400 }
      );
    }

    if (halfDayType !== 'none' && leaveTypeCode !== 'annual_leave') {
      return NextResponse.json(
        { error: 'Half-day option is only supported for annual leave' },
        { status: 400 }
      );
    }

    // Initialize leave balances if they don't exist for the request year
    await initializeAllLeaveBalances(employeeId, year);

    // Calculate leave duration on server (SOURCE OF TRUTH)
    const publicHolidays = await getPublicHolidaysForYear(year, query);
    const durationResult = calculateLeaveDuration({
      startDate,
      endDate,
      halfDayType: halfDayType as 'none' | 'first' | 'last' | 'both',
      excludeWeekends: true,
      publicHolidays,
    });

    if (durationResult.error) {
      return NextResponse.json(
        { error: durationResult.error },
        { status: 400 }
      );
    }

    const daysRequested = durationResult.days;

    // Validate duration
    const validationResult = validateLeaveDuration(
      daysRequested,
      await getAvailableBalance(employeeId, leaveTypeCode, year),
      user.role === 'admin'
    );

    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    // Check if employee has enough leave balance (unless admin)
    if (user.role !== 'admin') {
      const enoughBalance = await hasEnoughBalance(
        employeeId,
        leaveTypeCode,
        daysRequested,
        year
      );

      if (!enoughBalance) {
        return NextResponse.json(
          { error: `Insufficient leave balance. Requested: ${daysRequested} days` },
          { status: 400 }
        );
      }
    }

    // Check for overlapping vacation requests
    const overlapResult = await query(
      `SELECT COUNT(*) as count FROM vacation_requests
       WHERE employee_id = $1
       AND status IN ('pending', 'approved')
       AND (
         (start_date <= $2::date AND end_date >= $2::date) OR
         (start_date <= $3::date AND end_date >= $3::date) OR
         (start_date >= $2::date AND end_date <= $3::date)
       )`,
      [employeeId, startDate, endDate]
    );

    if (parseInt(overlapResult.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'This date range overlaps with an existing vacation request' },
        { status: 400 }
      );
    }

    // Insert vacation request with SERVER-CALCULATED duration
    const insertResult = await query(
      `INSERT INTO vacation_requests (employee_id, vacation_type_id, start_date, end_date, days_requested, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id`,
      [employeeId, vacationTypeId, startDate, endDate, daysRequested, reason || null]
    );

    const newId = insertResult.rows[0].id;

    // Return enriched row so UI can display new request without refresh
    const enriched = await query(
      `SELECT vr.id,
              vr.employee_id,
              vr.start_date,
              vr.end_date,
              vr.days_requested as duration_days,
              vr.reason,
              vr.status,
              vr.created_at,
              u.full_name,
              vt.name as vacation_type,
              vt.color,
              vt.excel_code,
              e.employee_id as employee_code
       FROM vacation_requests vr
       JOIN employees e ON vr.employee_id = e.id
       JOIN users u ON e.user_id = u.id
       JOIN vacation_types vt ON vr.vacation_type_id = vt.id
       WHERE vr.id = $1`,
      [newId]
    );

    return NextResponse.json(
      {
        ...enriched.rows[0],
        duration_days: daysRequested,
        calculatedDuration: daysRequested,
        durationBreakdown: durationResult.breakdown,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create vacation request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get available balance for an employee
 */
async function getAvailableBalance(
  employeeId: number,
  leaveTypeCode: string,
  year: number
): Promise<number> {
  try {
    const result = await query(
      `SELECT lb.remaining_days
       FROM leave_balances lb
       JOIN vacation_types vt ON lb.vacation_type_id = vt.id
       WHERE lb.employee_id = $1 AND vt.code = $2 AND lb.year = $3`,
      [employeeId, leaveTypeCode, year]
    );

    if (result.rows.length === 0) {
      return 0;
    }

    return parseFloat(result.rows[0].remaining_days) || 0;
  } catch (error) {
    console.error('Error getting available balance:', error);
    return 0;
  }
}
