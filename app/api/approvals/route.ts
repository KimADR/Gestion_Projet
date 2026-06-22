import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

const toNumber = (value: number | string | { toString(): string } | null | undefined) =>
  Number(value ?? 0);

function isSameMonthYear(date: Date | null | undefined, month: number, year: number) {
  if (!date) return false;
  const d = new Date(date);
  return d.getMonth() + 1 === month && d.getFullYear() === year;
}

/**
 * GET /api/approvals
 * Returns pending vacation requests for approval
 * Only accessible by admin/manager
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const statusParam = req.nextUrl.searchParams.get('status') || 'pending';
    const monthParam = req.nextUrl.searchParams.get('month') || null;

    const requests = await prisma.vacationRequest.findMany({
      where: {
        status: statusParam,
      },
      orderBy: {
        created_at: 'desc',
      },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
        vacationType: true,
        approval: {
          include: {
            approver: true,
          },
        },
      },
    });

    const current = new Date();
    const currentMonth = current.getMonth() + 1;
    const currentYear = current.getFullYear();

    const response = await Promise.all(
      requests.map(async (request) => {
        const approval = request.approval;

        if (
          statusParam === 'approved' &&
          monthParam === 'current' &&
          !isSameMonthYear(approval?.approved_at, currentMonth, currentYear)
        ) {
          return null;
        }

        const balance = await prisma.leaveBalance.findFirst({
          where: {
            employee_id: request.employee_id,
            vacation_type_id: request.vacation_type_id,
            year: new Date(request.start_date).getFullYear(),
          },
          select: {
            remaining_days: true,
          },
        });

        return {
          id: request.id,
          vacation_request_id: request.id,
          employee_id: request.employee_id,
          start_date: request.start_date,
          end_date: request.end_date,
          duration_days: toNumber(request.days_requested),
          reason: request.reason,
          status: request.status,
          created_at: request.created_at,
          full_name: request.employee.user.full_name,
          user_id: request.employee.user.id,
          vacation_type: request.vacationType.name,
          vacation_type_code: request.vacationType.code,
          color: request.vacationType.color,
          excel_code: request.vacationType.excel_code,
          employee_code: request.employee.employee_id,
          approval_id: approval?.id ?? null,
          approved: approval?.approved ?? null,
          approval_comments: approval?.comments ?? null,
          rejection_reason: approval?.rejection_reason ?? null,
          approved_at: approval?.approved_at ?? null,
          approver_name: approval?.approver?.full_name ?? null,
          available_balance: toNumber(balance?.remaining_days),
        };
      })
    );

    return NextResponse.json(response.filter((item): item is NonNullable<typeof item> => item !== null));
  } catch (error) {
    console.error('Get approvals error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/approvals
 * Create or update approval with balance verification and consumption
 */
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only admin or managers can approve requests' },
        { status: 403 }
      );
    }

    const { vacationRequestId, approved, comments, rejectionReason } = await req.json();

    if (!vacationRequestId) {
      return NextResponse.json(
        { error: 'vacationRequestId is required' },
        { status: 400 }
      );
    }

    if (typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'approved must be a boolean' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const vrRows = await tx.$queryRaw<
        Array<{
          id: number;
          status: string;
          employee_id: number;
          days_requested: number | string;
          vacation_type_id: number;
          start_date: Date;
          requester_user_id: number;
        }>
      >`
        SELECT
          vr.id,
          vr.status,
          vr.employee_id,
          vr.days_requested,
          vr.vacation_type_id,
          vr.start_date,
          e.user_id as requester_user_id
        FROM vacation_requests vr
        JOIN employees e ON vr.employee_id = e.id
        WHERE vr.id = ${vacationRequestId}
        FOR UPDATE
      `;

      if (vrRows.length === 0) {
        throw Object.assign(new Error('VACATION_REQUEST_NOT_FOUND'), {
          status: 404,
        });
      }

      const vr = vrRows[0];
      const requestedDays = Number(vr.days_requested);

      if (vr.status !== 'pending') {
        throw Object.assign(
          new Error(`Request cannot be approved: current status is '${vr.status}'`),
          { status: 400 }
        );
      }

      const { employee_id, vacation_type_id, start_date, requester_user_id } = vr;
      const balanceYear = new Date(start_date).getFullYear();

      if (requester_user_id === user.userId) {
        throw Object.assign(new Error('You cannot approve your own request'), {
          status: 403,
        });
      }

      if (approved) {
        const balanceRows = await tx.$queryRaw<
          Array<{
            remaining_days: number | string;
            accrued_days: number | string;
            used_days: number | string;
          }>
        >`
          SELECT remaining_days, accrued_days, used_days
          FROM leave_balances
          WHERE employee_id = ${employee_id}
            AND vacation_type_id = ${vacation_type_id}
            AND year = ${balanceYear}
          FOR UPDATE
        `;

        if (balanceRows.length === 0) {
          throw Object.assign(
            new Error('Leave balance not found for this employee and type'),
            {
              status: 404,
            }
          );
        }

        const balance = balanceRows[0];
        const availableBalance = Number(balance.remaining_days);
        const currentUsed = Number(balance.used_days);
        const totalAccrued = Number(balance.accrued_days);

        if (availableBalance < requestedDays) {
          throw Object.assign(
            new Error(
              `Insufficient leave balance. Available: ${availableBalance} days, Requested: ${requestedDays} days`
            ),
            {
              status: 400,
              details: {
                availableBalance,
                requestedDays,
                currentUsed,
                totalAccrued,
              },
            }
          );
        }

        await tx.$executeRaw`
          UPDATE leave_balances
          SET used_days = used_days + ${requestedDays},
              remaining_days = annual_quota + accrued_days - (used_days + ${requestedDays}),
              updated_at = CURRENT_TIMESTAMP
          WHERE employee_id = ${employee_id}
            AND vacation_type_id = ${vacation_type_id}
            AND year = ${balanceYear}
        `;
      }

      const approvalRecord = await tx.approval.upsert({
        where: {
          vacation_request_id: vacationRequestId,
        },
        update: {
          approved,
          approver_id: user.userId,
          comments: comments || null,
          rejection_reason: approved ? null : rejectionReason || null,
          approval_reason: approved ? comments || null : null,
          approved_at: new Date(),
          is_cancelled: false,
          cancelled_at: null,
          cancellation_reason: null,
        },
        create: {
          vacation_request_id: vacationRequestId,
          approver_id: user.userId,
          approved,
          comments: comments || null,
          rejection_reason: approved ? null : rejectionReason || null,
          approval_reason: approved ? comments || null : null,
          approved_at: new Date(),
        },
      });

      const newStatus = approved ? 'approved' : 'rejected';
      await tx.vacationRequest.update({
        where: { id: vacationRequestId },
        data: {
          status: newStatus,
          updated_at: new Date(),
        },
      });

      return {
        approvalRecord,
        newStatus,
        durationDays: requestedDays,
      };
    });

    const approver = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { full_name: true },
    });

    return NextResponse.json(
      {
        ...result.approvalRecord,
        vacation_request_status: result.newStatus,
        approver_name: approver?.full_name || 'Unknown',
        duration_days: result.durationDays,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'VACATION_REQUEST_NOT_FOUND') {
        return NextResponse.json(
          { error: 'Vacation request not found' },
          { status: 404 }
        );
      }

      if (error.message.includes('Request cannot be approved')) {
        const status = (error as Error & { status?: number }).status || 400;
        return NextResponse.json(
          { error: error.message },
          { status }
        );
      }

      if (error.message === 'You cannot approve your own request') {
        const status = (error as Error & { status?: number }).status || 403;
        return NextResponse.json(
          { error: error.message },
          { status }
        );
      }

      if (error.message === 'Leave balance not found for this employee and type') {
        const status = (error as Error & { status?: number }).status || 404;
        return NextResponse.json(
          { error: error.message },
          { status }
        );
      }

      if (error.message.includes('Insufficient leave balance')) {
        const details = (error as Error & { details?: Record<string, unknown> }).details;
        return NextResponse.json(
          {
            error: error.message,
            availableBalance: details?.availableBalance,
            requestedDays: details?.requestedDays,
            currentUsed: details?.currentUsed,
            totalAccrued: details?.totalAccrued,
          },
          { status: 400 }
        );
      }
    }

    console.error('Create approval error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as any).message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/approvals
 * Cancel an approved vacation request and restore leave balance
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only admin or managers can cancel requests' },
        { status: 403 }
      );
    }

    const { vacationRequestId, cancellationReason } = await req.json();

    if (!vacationRequestId) {
      return NextResponse.json(
        { error: 'vacationRequestId is required' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const approvalRows = await tx.$queryRaw<
        Array<{
          id: number;
          approved: boolean;
          is_cancelled: boolean;
          employee_id: number;
          vacation_type_id: number;
          days_requested: number | string;
          start_date: Date;
        }>
      >`
        SELECT
          a.id,
          a.approved,
          a.is_cancelled,
          vr.employee_id,
          vr.vacation_type_id,
          vr.days_requested,
          vr.start_date
        FROM approvals a
        JOIN vacation_requests vr ON a.vacation_request_id = vr.id
        WHERE a.vacation_request_id = ${vacationRequestId}
        FOR UPDATE
      `;

      if (approvalRows.length === 0) {
        throw Object.assign(new Error('Approval not found'), {
          status: 404,
        });
      }

      const approval = approvalRows[0];
      const daysRequested = Number(approval.days_requested);

      if (!approval.approved) {
        throw Object.assign(new Error('Can only cancel approved requests'), {
          status: 400,
        });
      }

      if (approval.is_cancelled) {
        throw Object.assign(new Error('This request has already been cancelled'), {
          status: 400,
        });
      }

      const { employee_id, vacation_type_id, start_date } = approval;
      const balanceYear = new Date(start_date).getFullYear();

      await tx.$queryRaw`
        SELECT employee_id, vacation_type_id, year
        FROM leave_balances
        WHERE employee_id = ${employee_id}
          AND vacation_type_id = ${vacation_type_id}
          AND year = ${balanceYear}
        FOR UPDATE
      `;

      await tx.$executeRaw`
        UPDATE leave_balances
        SET used_days = GREATEST(0, used_days - ${daysRequested}),
            remaining_days = annual_quota + accrued_days - GREATEST(0, used_days - ${daysRequested}),
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ${employee_id}
          AND vacation_type_id = ${vacation_type_id}
          AND year = ${balanceYear}
      `;

      const cancelResult = await tx.approval.update({
        where: { vacation_request_id: vacationRequestId },
        data: {
          is_cancelled: true,
          cancelled_at: new Date(),
          cancellation_reason: cancellationReason || null,
        },
      });

      await tx.vacationRequest.update({
        where: { id: vacationRequestId },
        data: {
          status: 'cancelled',
          updated_at: new Date(),
        },
      });

      return {
        cancelResult,
        daysRequested,
      };
    });

    return NextResponse.json(
      {
        ...result.cancelResult,
        vacation_request_status: 'cancelled',
        message: `Approved request cancelled. ${result.daysRequested} days restored to employee balance.`,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Approval not found') {
        const status = (error as Error & { status?: number }).status || 404;
        return NextResponse.json(
          { error: error.message },
          { status }
        );
      }

      if (
        error.message === 'Can only cancel approved requests' ||
        error.message === 'This request has already been cancelled'
      ) {
        const status = (error as Error & { status?: number }).status || 400;
        return NextResponse.json(
          { error: error.message },
          { status }
        );
      }
    }

    console.error('Cancel approval error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as any).message },
      { status: 500 }
    );
  }
}
