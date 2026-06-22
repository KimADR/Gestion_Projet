import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

        const employee = await prisma.employee.findUnique({
          where: { id: employeeId },
          select: { id: true },
        });

        if (!employee) {
          return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }
      } else if (employeeCodeParam) {
        const employee = await prisma.employee.findFirst({
          where: { employee_id: employeeCodeParam },
          select: { id: true },
        });

        if (!employee) {
          return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        employeeId = employee.id;
      }
    }

    if (!employeeId) {
      const employee = await prisma.employee.findFirst({
        where: { user_id: user.userId },
        select: { id: true },
      });

      if (!employee) {
        return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
      }

      employeeId = employee.id;
    }

    const balances = await prisma.leaveBalance.findMany({
      where: {
        employee_id: employeeId,
        year,
      },
      select: {
        id: true,
        employee_id: true,
        vacation_type_id: true,
        year: true,
        annual_quota: true,
        accrued_days: true,
        used_days: true,
        remaining_days: true,
        created_at: true,
        updated_at: true,
        vacationType: {
          select: {
            name: true,
            code: true,
            display_order: true,
          },
        },
      },
      orderBy: [
        { vacationType: { display_order: 'asc' } },
        { vacationType: { name: 'asc' } },
      ],
    });

    return NextResponse.json(
      balances.map((balance) => ({
        id: balance.id,
        employee_id: balance.employee_id,
        vacation_type_id: balance.vacation_type_id,
        vacation_type: balance.vacationType?.name ?? null,
        vacation_type_code: balance.vacationType?.code ?? null,
        year: balance.year,
        annual_quota: Number(balance.annual_quota ?? 0),
        accrued_days: Number(balance.accrued_days ?? 0),
        used_days: Number(balance.used_days ?? 0),
        remaining_days: Number(balance.remaining_days ?? 0),
        created_at: balance.created_at,
        updated_at: balance.updated_at,
      }))
    );
  } catch (error) {
    console.error('Get leave balances error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
