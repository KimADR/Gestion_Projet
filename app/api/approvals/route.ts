import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

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

    // Only admin and managers can view approvals
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Allow filtering: status (pending|approved|rejected) and month=current
    const statusParam = req.nextUrl.searchParams.get('status') || 'pending';
    const monthParam = req.nextUrl.searchParams.get('month') || null;

    const params = [statusParam];
    let monthFilter = '';

    if (statusParam === 'approved' && monthParam === 'current') {
      monthFilter = ` AND DATE_PART('month', a.approved_at) = DATE_PART('month', CURRENT_DATE) AND DATE_PART('year', a.approved_at) = DATE_PART('year', CURRENT_DATE)`;
    }

    const sql = `
      SELECT 
        vr.id,
        vr.id as vacation_request_id,
        vr.employee_id,
        vr.start_date,
        vr.end_date,
        vr.days_requested as duration_days,
        vr.reason,
        vr.status,
        vr.created_at,
        u.full_name,
        u.id as user_id,
        vt.name as vacation_type,
        vt.code as vacation_type_code,
        vt.color,
        vt.excel_code,
        e.employee_id as employee_code,
        a.id as approval_id,
        a.approved,
        a.comments as approval_comments,
        a.rejection_reason,
        a.approved_at,
        approver.full_name as approver_name,
        lb.remaining_days as available_balance
      FROM vacation_requests vr
      JOIN employees e ON vr.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      JOIN vacation_types vt ON vr.vacation_type_id = vt.id
      LEFT JOIN approvals a ON a.vacation_request_id = vr.id
      LEFT JOIN users approver ON a.approver_id = approver.id
      LEFT JOIN leave_balances lb ON lb.employee_id = vr.employee_id 
        AND lb.vacation_type_id = vr.vacation_type_id 
        AND lb.year = EXTRACT(YEAR FROM vr.start_date)
      WHERE vr.status = $1 ${monthFilter}
      ORDER BY vr.created_at DESC
    `;

    const result = await query(sql, params);

    return NextResponse.json(result.rows);
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
 * 
 * Request body:
 * {
 *   vacationRequestId: number,
 *   approved: boolean,
 *   comments?: string,
 *   rejectionReason?: string (only for rejection)
 * }
 * 
 * Approval flow:
 * 1. Verify request exists and is pending
 * 2. If approved=true:
 *    a. Get available balance for employee/type/year
 *    b. If balance < duration_days: return 400 error
 *    c. Consume balance (used_days += duration_days)
 *    d. Create/update approval record
 *    e. Set vacation_request status = 'approved'
 * 3. If approved=false:
 *    a. Don't modify balance
 *    b. Create/update approval record with rejection_reason
 *    c. Set vacation_request status = 'rejected'
 */
export async function POST(req: NextRequest) {
  const client = await getClient();
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and managers can approve/reject
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

    await client.query('BEGIN');

    try {
      // 1. Verify the vacation request exists and lock it to prevent concurrent approvals
      const vrCheck = await client.query(
        `SELECT 
          vr.id, vr.status, vr.employee_id, vr.days_requested, vr.vacation_type_id, 
          vr.start_date, vr.end_date, e.user_id as requester_user_id
        FROM vacation_requests vr
        JOIN employees e ON vr.employee_id = e.id
        WHERE vr.id = $1
        FOR UPDATE`,
        [vacationRequestId]
      );

      if (vrCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Vacation request not found' },
          { status: 404 }
        );
      }

      const vr = vrCheck.rows[0];

      if (vr.status !== 'pending') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: `Request cannot be approved: current status is '${vr.status}'` },
          { status: 400 }
        );
      }

      const { employee_id, days_requested, vacation_type_id, start_date, requester_user_id } = vr;
      const balanceYear = new Date(start_date).getFullYear();

      // Prevent approver from approving their own request
      if (requester_user_id === user.userId) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'You cannot approve your own request' },
          { status: 403 }
        );
      }

      // 2. If approving, verify balance is sufficient
      if (approved) {
        // Lock the leave balance row to prevent concurrent consumption
        const balanceCheck = await client.query(
          `SELECT remaining_days, accrued_days, used_days 
           FROM leave_balances 
           WHERE employee_id = $1 
           AND vacation_type_id = $2 
           AND year = $3
           FOR UPDATE`,
          [employee_id, vacation_type_id, balanceYear]
        );

        if (balanceCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: 'Leave balance not found for this employee and type' },
            { status: 404 }
          );
        }

        const balance = balanceCheck.rows[0];

        if (balance.remaining_days < days_requested) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            {
              error: `Insufficient leave balance. Available: ${balance.remaining_days} days, Requested: ${days_requested} days`,
              availableBalance: balance.remaining_days,
              requestedDays: days_requested,
              currentUsed: balance.used_days,
              totalAccrued: balance.accrued_days,
            },
            { status: 400 }
          );
        }

        // 2a. Consume leave balance (update used_days and remaining_days)
        await client.query(
          `UPDATE leave_balances 
           SET used_days = used_days + $1,
               remaining_days = annual_quota + accrued_days - (used_days + $1),
               updated_at = CURRENT_TIMESTAMP
           WHERE employee_id = $2 
           AND vacation_type_id = $3 
           AND year = $4`,
          [days_requested, employee_id, vacation_type_id, balanceYear]
        );
      }

      // 3. Create or update approval record
      const approvalCheck = await client.query(
        'SELECT id FROM approvals WHERE vacation_request_id = $1',
        [vacationRequestId]
      );

      let approvalResult;

      if (approvalCheck.rows.length > 0) {
        // Update existing approval
        approvalResult = await client.query(
          `UPDATE approvals 
           SET approved = $1, 
               approver_id = $2, 
               comments = $3,
               rejection_reason = $4,
               approval_reason = $5,
               approved_at = CURRENT_TIMESTAMP,
               is_cancelled = false,
               cancelled_at = null,
               cancellation_reason = null
           WHERE vacation_request_id = $6
           RETURNING *`,
          [
            approved,
            user.userId,
            comments || null,
            approved ? null : (rejectionReason || null),
            approved ? (comments || null) : null,
            vacationRequestId
          ]
        );
      } else {
        // Create new approval record
        approvalResult = await client.query(
          `INSERT INTO approvals 
           (vacation_request_id, approver_id, approved, comments, 
            rejection_reason, approval_reason, approved_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
           RETURNING *`,
          [
            vacationRequestId,
            user.userId,
            approved,
            comments || null,
            approved ? null : (rejectionReason || null),
            approved ? (comments || null) : null
          ]
        );
      }

      // 4. Update vacation request status
      const newStatus = approved ? 'approved' : 'rejected';
      await client.query(
        'UPDATE vacation_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStatus, vacationRequestId]
      );

      await client.query('COMMIT');

      // Get approver name from database
      const approverInfo = await query(
        'SELECT full_name FROM users WHERE id = $1',
        [user.userId]
      );

      const approverName = approverInfo.rows[0]?.full_name || 'Unknown';

      // Return approval record with updated vacation request info
      const response = {
        ...approvalResult.rows[0],
        vacation_request_status: newStatus,
        approver_name: approverName,
        duration_days: days_requested,
      };

      return NextResponse.json(response, { status: 201 });
    } catch (innerError) {
      await client.query('ROLLBACK');
      throw innerError;
    }
  } catch (error) {
    console.error('Create approval error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as any).message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/approvals
 * Cancel an approved vacation request and restore leave balance
 * 
 * Request body:
 * {
 *   vacationRequestId: number,
 *   cancellationReason?: string
 * }
 * 
 * Cancellation flow:
 * 1. Verify approval exists and is approved (not rejected/cancelled)
 * 2. Get vacation request duration_days
 * 3. Restore balance (used_days -= duration_days)
 * 4. Mark approval as cancelled
 * 5. Change vacation_request status to 'cancelled'
 */
export async function PATCH(req: NextRequest) {
  const client = await getClient();
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and managers can cancel approvals
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

    await client.query('BEGIN');

    try {
      // 1. Verify approval exists
      const approvalCheck = await client.query(
        `SELECT a.id, a.approved, a.is_cancelled, vr.employee_id, vr.vacation_type_id, vr.days_requested, vr.start_date
         FROM approvals a
         JOIN vacation_requests vr ON a.vacation_request_id = vr.id
         WHERE a.vacation_request_id = $1`,
        [vacationRequestId]
      );

      if (approvalCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Approval not found' },
          { status: 404 }
        );
      }

      const approval = approvalCheck.rows[0];

      // 1a. Can only cancel if it was approved
      if (!approval.approved) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Can only cancel approved requests' },
          { status: 400 }
        );
      }

      // 1b. Cannot cancel if already cancelled
      if (approval.is_cancelled) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'This request has already been cancelled' },
          { status: 400 }
        );
      }

      const { employee_id, vacation_type_id, days_requested, start_date } = approval;
      const balanceYear = new Date(start_date).getFullYear();

      // 2. Restore leave balance
      await client.query(
        `UPDATE leave_balances 
         SET used_days = GREATEST(0, used_days - $1),
             remaining_days = annual_quota + accrued_days - GREATEST(0, used_days - $1),
             updated_at = CURRENT_TIMESTAMP
         WHERE employee_id = $2 
         AND vacation_type_id = $3 
         AND year = $4`,
        [days_requested, employee_id, vacation_type_id, balanceYear]
      );

      // 3. Mark approval as cancelled
      const cancelResult = await client.query(
        `UPDATE approvals 
         SET is_cancelled = true,
             cancelled_at = CURRENT_TIMESTAMP,
             cancellation_reason = $1
         WHERE vacation_request_id = $2
         RETURNING *`,
        [cancellationReason || null, vacationRequestId]
      );

      // 4. Change vacation request status to cancelled
      await client.query(
        'UPDATE vacation_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['cancelled', vacationRequestId]
      );

      await client.query('COMMIT');

      return NextResponse.json(
        {
          ...cancelResult.rows[0],
          vacation_request_status: 'cancelled',
          message: `Approved request cancelled. ${days_requested} days restored to employee balance.`,
        },
        { status: 200 }
      );
    } catch (innerError) {
      await client.query('ROLLBACK');
      throw innerError;
    }
  } catch (error) {
    console.error('Cancel approval error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as any).message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

