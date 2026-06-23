import { prisma } from '@/lib/prisma';

/**
 * Leave Duration Calculation Module
 * Centralized business logic for computing vacation duration
 * Server-side validation ensures data integrity
 */

interface LeaveDurationParams {
  startDate: string | Date; // ISO format: YYYY-MM-DD
  endDate: string | Date;
  halfDayType?: 'none' | 'first' | 'last' | 'both'; // Which days are half-days
  excludeWeekends?: boolean; // Default: true
  publicHolidays?: string[]; // ISO dates YYYY-MM-DD
}

interface DurationCalculationResult {
  days: number;
  breakdown: {
    fullDays: number;
    halfDays: number;
    weekendDaysExcluded: number;
    publicHolidaysExcluded: number;
  };
  error?: string;
}

/**
 * Parse ISO date string to Date object (handles YYYY-MM-DD format)
 */
function parseDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  }
  const [year, month, day] = dateInput.split('-').map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date format: ${dateInput}. Expected YYYY-MM-DD`);
  }
  return new Date(year, month - 1, day);
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Check if date is a weekend (Saturday=6, Sunday=0)
 */
function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * Check if date is in public holidays list
 */
function isPublicHoliday(date: Date, publicHolidays: string[]): boolean {
  const dateISO = formatDateISO(date);
  return publicHolidays.includes(dateISO);
}

/**
 * Calculate total vacation days between start and end dates
 *
 * Rules:
 * - Full day: 1.0
 * - Half day: 0.5
 * - Weekends excluded by default
 * - Public holidays excluded if provided
 * - Includes both start and end dates
 *
 * @param params Leave duration calculation parameters
 * @returns Duration result with breakdown
 *
 * @example
 * calculateLeaveDuration({
 *   startDate: '2026-06-15',
 *   endDate: '2026-06-19',
 *   halfDayType: 'first',
 *   excludeWeekends: true,
 *   publicHolidays: ['2026-06-18']
 * })
 * // Returns: { days: 3.5, breakdown: {...} }
 */
export function calculateLeaveDuration(
  params: LeaveDurationParams
): DurationCalculationResult {
  try {
    const {
      startDate,
      endDate,
      halfDayType = 'none',
      excludeWeekends = true,
      publicHolidays = [],
    } = params;

    // Parse dates
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    // Validate date range
    if (start > end) {
      return {
        days: 0,
        breakdown: {
          fullDays: 0,
          halfDays: 0,
          weekendDaysExcluded: 0,
          publicHolidaysExcluded: 0,
        },
        error: 'Start date must be before or equal to end date',
      };
    }

    let fullDays = 0;
    let halfDays = 0;
    let weekendCount = 0;
    let publicHolidayCount = 0;

    // Iterate through each day in range (inclusive)
    const currentDate = new Date(start);
    const daysInRange: {
      date: Date;
      isWeekend: boolean;
      isHoliday: boolean;
      isHalfDay: boolean;
    }[] = [];

    while (currentDate <= end) {
      const isWknd = isWeekend(currentDate);
      const isHoly = isPublicHoliday(currentDate, publicHolidays);
      let isHlfDay = false;

      // Check if this day should be counted as half-day
      if (halfDayType === 'first' && currentDate.getTime() === start.getTime()) {
        isHlfDay = true;
      } else if (
        halfDayType === 'last' &&
        currentDate.getTime() === end.getTime()
      ) {
        isHlfDay = true;
      } else if (
        halfDayType === 'both' &&
        (currentDate.getTime() === start.getTime() ||
          currentDate.getTime() === end.getTime())
      ) {
        isHlfDay = true;
      }

      daysInRange.push({
        date: new Date(currentDate),
        isWeekend: isWknd,
        isHoliday: isHoly,
        isHalfDay: isHlfDay,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count working days
    daysInRange.forEach((day) => {
      // Skip weekends if requested
      if (excludeWeekends && day.isWeekend) {
        weekendCount++;
        return;
      }

      // Skip public holidays if provided
      if (day.isHoliday && publicHolidays.length > 0) {
        publicHolidayCount++;
        return;
      }

      // Count as half or full day
      if (day.isHalfDay) {
        halfDays += 1;
      } else {
        fullDays += 1;
      }
    });

    const totalDays = fullDays + halfDays * 0.5;

    return {
      days: totalDays,
      breakdown: {
        fullDays,
        halfDays,
        weekendDaysExcluded: weekendCount,
        publicHolidaysExcluded: publicHolidayCount,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      days: 0,
      breakdown: {
        fullDays: 0,
        halfDays: 0,
        weekendDaysExcluded: 0,
        publicHolidaysExcluded: 0,
      },
      error: `Duration calculation error: ${errorMessage}`,
    };
  }
}

/**
 * Validate leave duration request
 * Ensures duration > 0 and check against available balance
 */
export function validateLeaveDuration(
  duration: number,
  availableBalance: number,
  isAdmin: boolean = false
): { valid: boolean; error?: string } {
  if (duration <= 0) {
    return {
      valid: false,
      error: 'Leave duration must be greater than 0 days',
    };
  }

  if (!isAdmin && duration > availableBalance) {
    return {
      valid: false,
      error: `Insufficient leave balance. Requested: ${duration} days, Available: ${availableBalance} days`,
    };
  }

  return { valid: true };
}

/**
 * Fetch public holidays for a given year from database
 * Used in API routes to get holiday list for calculation
 */
export async function getPublicHolidaysForYear(
  year: number,
  client: typeof prisma = prisma
): Promise<string[]> {
  try {
    const holidays = await client.publicHoliday.findMany({
      where: {
        holiday_date: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
      orderBy: {
        holiday_date: 'asc',
      },
      select: {
        holiday_date: true,
      },
    });

    return holidays.map((holiday) => formatDateISO(new Date(holiday.holiday_date)));
  } catch (error) {
    console.warn(`Failed to fetch public holidays for year ${year}:`, error);
    return [];
  }
}
