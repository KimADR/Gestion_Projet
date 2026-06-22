import { query } from './db';

export interface LeaveBalance {
  id: number;
  employee_id: number;
  vacation_type_id: number;
  year: number;
  annual_quota: number;
  accrued_days: number;
  used_days: number;
  remaining_days: number;
  created_at: string;
  updated_at: string;
}

// Default quotas per vacation type (TekFutura system)
const DEFAULT_QUOTAS: Record<string, number> = {
  annual_leave: 22, // Congé annuel complet
  annual_leave_half: 0, // Demi-journée (ne consomme pas de quota général)
  sick_leave: 10.98, // Repos maladie
  permission: 10.98, // Permission
  unpaid_leave: 0, // Non-payé (illimité)
  maternity_leave: 0, // Maternité (spécial)
};

/**
 * Get the current year's leave balance for an employee and vacation type
 */
export async function getLeaveBalance(
  employeeId: number,
  leaveTypeCode: string,
  year: number = new Date().getFullYear()
): Promise<LeaveBalance | null> {
  try {
    const result = await query(
      `SELECT lb.*
       FROM leave_balances lb
       JOIN vacation_types vt ON lb.vacation_type_id = vt.id
       WHERE lb.employee_id = $1
       AND vt.code = $2
       AND lb.year = $3`,
      [employeeId, leaveTypeCode, year]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error getting leave balance:', error);
    return null;
  }
}

/**
 * Get all leave balances for an employee for a specific year
 */
export async function getEmployeeLeaveBalances(
  employeeId: number,
  year: number = new Date().getFullYear()
): Promise<LeaveBalance[]> {
  try {
    const result = await query(
      `SELECT *
       FROM leave_balances
       WHERE employee_id = $1
       AND year = $2
       ORDER BY created_at`,
      [employeeId, year]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting employee leave balances:', error);
    return [];
  }
}

/**
 * Check if employee has enough leave balance
 */
export async function hasEnoughBalance(
  employeeId: number,
  leaveTypeCode: string,
  daysRequested: number,
  year: number = new Date().getFullYear()
): Promise<boolean> {
  const balance = await getLeaveBalance(employeeId, leaveTypeCode, year);

  if (!balance) {
    // If no balance record exists, create one with default quota
    await initializeLeaveBalance(employeeId, leaveTypeCode, year);
    const newBalance = await getLeaveBalance(employeeId, leaveTypeCode, year);
    return newBalance ? daysRequested <= newBalance.remaining_days : false;
  }

  return daysRequested <= balance.remaining_days;
}

/**
 * Get remaining days for a specific leave type
 */
export async function getRemainingDays(
  employeeId: number,
  leaveTypeCode: string,
  year: number = new Date().getFullYear()
): Promise<number> {
  const balance = await getLeaveBalance(employeeId, leaveTypeCode, year);
  return balance ? balance.remaining_days : 0;
}

/**
 * Consume leave days when a request is approved
 */
export async function consumeLeaveBalance(
  employeeId: number,
  leaveTypeId: number,
  daysToConsume: number,
  year: number = new Date().getFullYear()
): Promise<boolean> {
  try {
    const result = await query(
      `UPDATE leave_balances
       SET used_days = used_days + $1,
           remaining_days = annual_quota + accrued_days - (used_days + $1),
           updated_at = CURRENT_TIMESTAMP
       WHERE employee_id = $2
       AND vacation_type_id = $3
       AND year = $4
       RETURNING *`,
      [daysToConsume, employeeId, leaveTypeId, year]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error consuming leave balance:', error);
    return false;
  }
}

/**
 * Restore leave days when a request is rejected or cancelled
 */
export async function restoreLeaveBalance(
  employeeId: number,
  leaveTypeId: number,
  daysToRestore: number,
  year: number = new Date().getFullYear()
): Promise<boolean> {
  try {
    const result = await query(
      `UPDATE leave_balances
       SET used_days = GREATEST(0, used_days - $1),
           remaining_days = annual_quota + accrued_days - GREATEST(0, used_days - $1),
           updated_at = CURRENT_TIMESTAMP
       WHERE employee_id = $2
       AND vacation_type_id = $3
       AND year = $4
       RETURNING *`,
      [daysToRestore, employeeId, leaveTypeId, year]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error restoring leave balance:', error);
    return false;
  }
}

/**
 * Initialize leave balance for an employee for a specific year
 */
export async function initializeLeaveBalance(
  employeeId: number,
  leaveTypeCode: string,
  year: number = new Date().getFullYear()
): Promise<LeaveBalance | null> {
  try {
    // Get leave type ID
    const typeResult = await query(
      'SELECT id FROM vacation_types WHERE code = $1',
      [leaveTypeCode]
    );

    if (typeResult.rows.length === 0) {
      console.error(`Leave type ${leaveTypeCode} not found`);
      return null;
    }

    const leaveTypeId = typeResult.rows[0].id;
    const annualQuota = DEFAULT_QUOTAS[leaveTypeCode] || 0;

    // Insert or update leave balance
    const result = await query(
      `INSERT INTO leave_balances (employee_id, vacation_type_id, year, annual_quota, accrued_days, used_days, remaining_days)
       VALUES ($1, $2, $3, $4, 0, 0, $4)
       ON CONFLICT (employee_id, vacation_type_id, year) DO UPDATE
       SET annual_quota = $4, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [employeeId, leaveTypeId, year, annualQuota]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error initializing leave balance:', error);
    return null;
  }
}

/**
 * Initialize all leave balances for an employee for a specific year
 */
export async function initializeAllLeaveBalances(
  employeeId: number,
  year: number = new Date().getFullYear()
): Promise<void> {
  try {
    for (const [code] of Object.entries(DEFAULT_QUOTAS)) {
      await initializeLeaveBalance(employeeId, code, year);
    }
  } catch (error) {
    console.error('Error initializing all leave balances:', error);
  }
}

/**
 * Get leave balance details including vacation type name
 */
export async function getLeaveBalanceDetails(
  employeeId: number,
  year: number = new Date().getFullYear()
): Promise<Array<LeaveBalance & { vacation_type: string }>> {
  try {
    const result = await query(
      `SELECT lb.*, vt.name as vacation_type
       FROM leave_balances lb
       JOIN vacation_types vt ON lb.vacation_type_id = vt.id
       WHERE lb.employee_id = $1
       AND lb.year = $2
       ORDER BY vt.name`,
      [employeeId, year]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting leave balance details:', error);
    return [];
  }
}
