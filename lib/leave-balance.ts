import { prisma } from '@/lib/prisma';

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
  annual_leave: 22,
  annual_leave_half: 0,
  sick_leave: 10.98,
  permission: 10.98,
  unpaid_leave: 0,
  maternity_leave: 0,
};

type PrismaClientLike = typeof prisma;

function toNumber(value: number | string | null | undefined | { toNumber?: () => number; toString?: () => string }): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    const parsed = value.toNumber();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === 'object' && 'toString' in value && typeof value.toString === 'function') {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toISOString(value: Date | string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeLeaveBalance(balance: any): LeaveBalance {
  return {
    id: balance.id,
    employee_id: balance.employee_id,
    vacation_type_id: balance.vacation_type_id,
    year: balance.year,
    annual_quota: toNumber(balance.annual_quota),
    accrued_days: toNumber(balance.accrued_days),
    used_days: toNumber(balance.used_days),
    remaining_days: toNumber(balance.remaining_days),
    created_at: toISOString(balance.created_at),
    updated_at: toISOString(balance.updated_at),
  };
}

/**
 * Get the current year's leave balance for an employee and vacation type
 */
export async function getLeaveBalance(
  employeeId: number,
  leaveTypeCode: string,
  year: number = new Date().getFullYear(),
  client: PrismaClientLike = prisma
): Promise<LeaveBalance | null> {
  try {
    const balance = await client.leaveBalance.findFirst({
      where: {
        employee_id: employeeId,
        year,
        vacationType: {
          code: leaveTypeCode,
        },
      },
    });

    return balance ? normalizeLeaveBalance(balance) : null;
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
  year: number = new Date().getFullYear(),
  client: PrismaClientLike = prisma
): Promise<LeaveBalance[]> {
  try {
    const balances = await client.leaveBalance.findMany({
      where: {
        employee_id: employeeId,
        year,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return balances.map(normalizeLeaveBalance);
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
  year: number = new Date().getFullYear(),
  client: PrismaClientLike = prisma
): Promise<boolean> {
  const balance = await getLeaveBalance(employeeId, leaveTypeCode, year, client);

  if (!balance) {
    await initializeLeaveBalance(employeeId, leaveTypeCode, year, client);
    const newBalance = await getLeaveBalance(employeeId, leaveTypeCode, year, client);
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
  year: number = new Date().getFullYear(),
  client: PrismaClientLike = prisma
): Promise<number> {
  const balance = await getLeaveBalance(employeeId, leaveTypeCode, year, client);
  return balance ? balance.remaining_days : 0;
}

/**
 * Consume leave days when a request is approved
 */
export async function consumeLeaveBalance(
  employeeId: number,
  leaveTypeId: number,
  daysToConsume: number,
  year: number = new Date().getFullYear(),
  client: PrismaClientLike = prisma
): Promise<boolean> {
  try {
    const current = await client.leaveBalance.findFirst({
      where: {
        employee_id: employeeId,
        vacation_type_id: leaveTypeId,
        year,
      },
    });

    if (!current) {
      return false;
    }

    const usedDays = toNumber(current.used_days) + daysToConsume;
    const annualQuota = toNumber(current.annual_quota);
    const accruedDays = toNumber(current.accrued_days);

    const updated = await client.leaveBalance.update({
      where: {
        id: current.id,
      },
      data: {
        used_days: usedDays,
        remaining_days: annualQuota + accruedDays - usedDays,
        updated_at: new Date(),
      },
    });

    return Boolean(updated);
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
  year: number = new Date().getFullYear(),
  client: PrismaClientLike = prisma
): Promise<boolean> {
  try {
    const current = await client.leaveBalance.findFirst({
      where: {
        employee_id: employeeId,
        vacation_type_id: leaveTypeId,
        year,
      },
    });

    if (!current) {
      return false;
    }

    const usedDays = Math.max(0, toNumber(current.used_days) - daysToRestore);
    const annualQuota = toNumber(current.annual_quota);
    const accruedDays = toNumber(current.accrued_days);

    const updated = await client.leaveBalance.update({
      where: {
        id: current.id,
      },
      data: {
        used_days: usedDays,
        remaining_days: annualQuota + accruedDays - usedDays,
        updated_at: new Date(),
      },
    });

    return Boolean(updated);
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
  year: number = new Date().getFullYear(),
  client: PrismaClientLike = prisma
): Promise<LeaveBalance | null> {
  try {
    const leaveType = await client.vacationType.findUnique({
      where: {
        code: leaveTypeCode,
      },
      select: {
        id: true,
      },
    });

    if (!leaveType) {
      console.error(`Leave type ${leaveTypeCode} not found`);
      return null;
    }

    const leaveTypeId = leaveType.id;
    const annualQuota = DEFAULT_QUOTAS[leaveTypeCode] || 0;

    const created = await client.leaveBalance.upsert({
      where: {
        employee_id_vacation_type_id_year: {
          employee_id: employeeId,
          vacation_type_id: leaveTypeId,
          year,
        },
      },
      update: {
        annual_quota: annualQuota,
        updated_at: new Date(),
      },
      create: {
        employee_id: employeeId,
        vacation_type_id: leaveTypeId,
        year,
        annual_quota: annualQuota,
        accrued_days: 0,
        used_days: 0,
        remaining_days: annualQuota,
      },
    });

    return normalizeLeaveBalance(created);
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
  year: number = new Date().getFullYear(),
  client: PrismaClientLike = prisma
): Promise<void> {
  try {
    for (const code of Object.keys(DEFAULT_QUOTAS)) {
      await initializeLeaveBalance(employeeId, code, year, client);
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
  year: number = new Date().getFullYear(),
  client: PrismaClientLike = prisma
): Promise<Array<LeaveBalance & { vacation_type: string }>> {
  try {
    const balances = await client.leaveBalance.findMany({
      where: {
        employee_id: employeeId,
        year,
      },
      include: {
        vacationType: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return balances.map((balance) => ({
      ...normalizeLeaveBalance(balance),
      vacation_type: balance.vacationType.name,
    }));
  } catch (error) {
    console.error('Error getting leave balance details:', error);
    return [];
  }
}
