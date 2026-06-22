import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLeaveBalance, hasEnoughBalance, initializeAllLeaveBalances } from '@/lib/leave-balance';
import {
  calculateLeaveDuration,
  validateLeaveDuration,
  getPublicHolidaysForYear,
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

    const { vacationTypeId, startDate, endDate, halfDayType = 'none', reason } = await req.json();

    if (!vacationTypeId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: vacationTypeId, startDate, endDate' },
        { status: 400 }
      );
    }

    const employeeRecord = await prisma.employee.findFirst({
      where: {
        user_id: user.userId,
      },
      select: {
        id: true,
      },
    });

    if (!employeeRecord) {
      return NextResponse.json(
        { error: 'Employee record not found' },
        { status: 404 }
      );
    }

    const employeeId = employeeRecord.id;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start.getFullYear() !== end.getFullYear()) {
      return NextResponse.json(
        { error: 'Start date and end date must be within the same year for now' },
        { status: 400 }
      );
    }

    const year = start.getFullYear();

    const vacationType = await prisma.vacationType.findUnique({
      where: {
        id: vacationTypeId,
      },
      select: {
        code: true,
      },
    });

    if (!vacationType) {
      return NextResponse.json(
        { error: 'Vacation type not found' },
        { status: 404 }
      );
    }

    const leaveTypeCode = vacationType.code;

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

    await initializeAllLeaveBalances(employeeId, year);

    const publicHolidays = await getPublicHolidaysForYear(year);
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

    const overlappingCount = await prisma.vacationRequest.count({
      where: {
        employee_id: employeeId,
        status: {
          in: ['pending', 'approved'],
        },
        OR: [
          {
            start_date: {
              lte: new Date(endDate),
            },
            end_date: {
              gte: new Date(startDate),
            },
          },
          {
            start_date: {
              lte: new Date(startDate),
            },
            end_date: {
              gte: new Date(endDate),
            },
          },
        ],
      },
    });

    if (overlappingCount > 0) {
      return NextResponse.json(
        { error: 'This date range overlaps with an existing vacation request' },
        { status: 400 }
      );
    }

    const createdRequest = await prisma.vacationRequest.create({
      data: {
        employee_id: employeeId,
        vacation_type_id: vacationTypeId,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        days_requested: daysRequested,
        reason: reason || null,
        status: 'pending',
      },
      select: {
        id: true,
      },
    });

    const enriched = await prisma.vacationRequest.findUnique({
      where: {
        id: createdRequest.id,
      },
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
    });

    if (!enriched) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: enriched.id,
        employee_id: enriched.employee_id,
        start_date: enriched.start_date,
        end_date: enriched.end_date,
        duration_days: daysRequested,
        reason: enriched.reason,
        status: enriched.status,
        created_at: enriched.created_at,
        full_name: enriched.employee.user.full_name,
        vacation_type: enriched.vacationType.name,
        color: enriched.vacationType.color,
        excel_code: enriched.vacationType.excel_code,
        employee_code: enriched.employee.employee_id,
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
    const balance = await getLeaveBalance(employeeId, leaveTypeCode, year);
    return Number(balance?.remaining_days ?? 0);
  } catch (error) {
    console.error('Error getting available balance:', error);
    return 0;
  }
}
