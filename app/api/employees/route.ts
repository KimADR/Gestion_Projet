import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
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

    const employees = await prisma.employee.findMany({
      where: {
        is_active: true,
      },
      orderBy: {
        user: {
          full_name: 'asc',
        },
      },
      select: {
        id: true,
        user_id: true,
        employee_id: true,
        position: true,
        hired_date: true,
        is_active: true,
        total_vacation_days: true,
        used_vacation_days: true,
        user: {
          select: {
            full_name: true,
            email: true,
            is_active: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json(
      employees.map((employee) => ({
        id: employee.id,
        user_id: employee.user_id,
        employee_id: employee.employee_id,
        position: employee.position,
        hired_date: employee.hired_date,
        is_active: employee.is_active,
        total_vacation_days: employee.total_vacation_days,
        used_vacation_days: employee.used_vacation_days,
        full_name: employee.user.full_name,
        email: employee.user.email,
        user_active: employee.user.is_active,
        department_id: employee.department.id,
        department: employee.department.name,
        department_code: employee.department.code,
      }))
    );
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    const fullName = `${firstName} ${lastName}`;
    const hashedPassword = await bcryptjs.hash(password, 10);
    const currentYear = new Date().getFullYear();

    const DEFAULT_QUOTAS: Record<string, number> = {
      annual_leave: 22,
      annual_leave_half: 0,
      sick_leave: 10.98,
      permission: 10.98,
      unpaid_leave: 0,
      maternity_leave: 0,
    };

    try {
      const result = await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          throw Object.assign(new Error(`Email ${email} is already in use`), {
            status: 409,
          });
        }

        const codeExists = await tx.employee.findUnique({
          where: { employee_id: employeeCode },
        });

        if (codeExists) {
          throw Object.assign(
            new Error(`Employee code ${employeeCode} is already in use`),
            { status: 409 }
          );
        }

        const department = await tx.department.findUnique({
          where: { id: departmentId },
        });

        if (!department) {
          throw Object.assign(new Error('Department not found'), {
            status: 404,
          });
        }

        const user = await tx.user.create({
          data: {
            email,
            password_hash: hashedPassword,
            full_name: fullName,
            role: 'employee',
            is_active: true,
          },
          select: {
            id: true,
          },
        });

        const employee = await tx.employee.create({
          data: {
            user_id: user.id,
            employee_id: employeeCode,
            department_id: departmentId,
            position,
            hired_date: new Date(hireDate),
            is_active: true,
          },
          select: {
            id: true,
          },
        });

        const vacationTypes = await tx.vacationType.findMany({
          select: {
            id: true,
            code: true,
          },
        });

        if (vacationTypes.length > 0) {
          await tx.leaveBalance.createMany({
            data: vacationTypes.map((vacationType) => ({
              employee_id: employee.id,
              vacation_type_id: vacationType.id,
              year: currentYear,
              annual_quota: DEFAULT_QUOTAS[vacationType.code] || 0,
              accrued_days: 0,
              used_days: 0,
              remaining_days: DEFAULT_QUOTAS[vacationType.code] || 0,
            })),
            skipDuplicates: true,
          });
        }

        return employee.id;
      });

      const employee = await prisma.employee.findUniqueOrThrow({
        where: { id: result },
        select: {
          id: true,
          user_id: true,
          employee_id: true,
          position: true,
          hired_date: true,
          is_active: true,
          user: {
            select: {
              full_name: true,
              email: true,
            },
          },
          department: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      });

      return NextResponse.json(
        {
          id: employee.id,
          user_id: employee.user_id,
          employee_id: employee.employee_id,
          position: employee.position,
          hired_date: employee.hired_date,
          is_active: employee.is_active,
          full_name: employee.user.full_name,
          email: employee.user.email,
          department: employee.department.name,
          department_code: employee.department.code,
        },
        { status: 201 }
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === `Email ${email} is already in use` ||
          error.message === `Employee code ${employeeCode} is already in use`)
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }

      if (error instanceof Error && error.message === 'Department not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(',')
          : String(error.meta?.target || '');

        if (target.includes('email')) {
          return NextResponse.json(
            { error: `Email ${email} is already in use` },
            { status: 409 }
          );
        }

        if (target.includes('employee_id')) {
          return NextResponse.json(
            { error: `Employee code ${employeeCode} is already in use` },
            { status: 409 }
          );
        }
      }

      console.error('Create employee error:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
