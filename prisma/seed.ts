import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

let prisma: any;
const YEAR = 2026;

const departments = [
  { code: 'NORD', name: 'Nord' },
  { code: 'SUD', name: 'Sud' },
  { code: 'FTU', name: 'Fonction Support' },
  { code: 'DQO', name: 'Direction Qualité et Opération' },
  { code: 'DCP', name: 'Direction Commerciale et Partenariats' },
  { code: 'DT', name: 'Direction Technique' },
];

const vacationTypes = [
  {
    code: 'annual_leave',
    name: 'Congé Annuel',
    description: 'Congé annuel payé - 22 jours',
    requires_approval: true,
    color: '#3B82F6',
    excel_code: 'C',
    display_order: 1,
  },
  {
    code: 'annual_leave_half',
    name: 'Demi-Journée Annuel',
    description: 'Demi-journée congé annuel - 0.5 jour',
    requires_approval: true,
    color: '#60A5FA',
    excel_code: '-',
    display_order: 2,
  },
  {
    code: 'sick_leave',
    name: 'Repos Maladie',
    description: 'Congé maladie payé - 10.98 jours',
    requires_approval: false,
    color: '#EF4444',
    excel_code: 'M',
    display_order: 3,
  },
  {
    code: 'permission',
    name: 'Permission',
    description: 'Permission - 10.98 jours',
    requires_approval: false,
    color: '#10B981',
    excel_code: 'P',
    display_order: 4,
  },
];

const demoEmployees = [
  {
    userEmail: 'employee1@example.com',
    password: 'employee123',
    fullName: 'Demo One',
    employeeCode: 'EMP001',
    departmentCode: 'DT',
    position: 'Développeur',
    hiredDate: '2024-01-15',
    totalVacationDays: 25,
    usedVacationDays: 2,
  },
  {
    userEmail: 'employee2@example.com',
    password: 'employee123',
    fullName: 'Demo Two',
    employeeCode: 'EMP002',
    departmentCode: 'FTU',
    position: 'Responsable Support',
    hiredDate: '2023-06-01',
    totalVacationDays: 25,
    usedVacationDays: 1,
  },
];

const holidayEntries = [
  { holiday_date: '2026-01-01', name: "Jour de l'An", country_code: 'MG' },
  { holiday_date: '2026-06-26', name: 'Fête Nationale', country_code: 'MG' },
  { holiday_date: '2026-12-25', name: 'Noël', country_code: 'MG' },
];

const adminUser = {
  email: 'admin@example.com',
  password: 'admin123',
  full_name: 'Admin User',
  role: 'admin',
};

const leaveBalanceTemplates = [
  {
    code: 'annual_leave',
    annual_quota: 22,
    accrued_days: 5,
    used_days: 2,
  },
  {
    code: 'annual_leave_half',
    annual_quota: 0,
    accrued_days: 0,
    used_days: 0,
  },
  {
    code: 'sick_leave',
    annual_quota: 10.98,
    accrued_days: 0,
    used_days: 0,
  },
  {
    code: 'permission',
    annual_quota: 10.98,
    accrued_days: 0,
    used_days: 1,
  },
];

async function upsertDepartments() {
  const results = [];
  for (const data of departments) {
    const record = await prisma.department.upsert({
      where: { code: data.code },
      update: { name: data.name },
      create: { code: data.code, name: data.name },
    });
    results.push(record);
  }
  return results;
}

async function upsertVacationTypes() {
  const results = [];
  for (const type of vacationTypes) {
    const record = await prisma.vacationType.upsert({
      where: { code: type.code },
      update: {
        name: type.name,
        description: type.description,
        requires_approval: type.requires_approval,
        color: type.color,
        excel_code: type.excel_code,
        display_order: type.display_order,
      },
      create: {
        code: type.code,
        name: type.name,
        description: type.description,
        requires_approval: type.requires_approval,
        color: type.color,
        excel_code: type.excel_code,
        display_order: type.display_order,
      },
    });
    results.push(record);
  }
  return results;
}

async function upsertUser(email: string, fullName: string, role: string, password: string) {
  const password_hash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {
      full_name: fullName,
      role,
      is_active: true,
      password_hash,
      updated_at: new Date(),
    },
    create: {
      email,
      full_name: fullName,
      role,
      is_active: true,
      password_hash,
    },
  });
}

async function upsertEmployee(employeeData: typeof demoEmployees[number], userId: number) {
  const department = await prisma.department.findUnique({
    where: { code: employeeData.departmentCode },
  });

  if (!department) {
    throw new Error(`Department not found for code ${employeeData.departmentCode}`);
  }

  return prisma.employee.upsert({
    where: { employee_id: employeeData.employeeCode },
    update: {
      user_id: userId,
      department_id: department.id,
      position: employeeData.position,
      hired_date: new Date(employeeData.hiredDate),
      is_active: true,
      total_vacation_days: employeeData.totalVacationDays,
      used_vacation_days: employeeData.usedVacationDays,
      updated_at: new Date(),
    },
    create: {
      user_id: userId,
      employee_id: employeeData.employeeCode,
      department_id: department.id,
      position: employeeData.position,
      hired_date: new Date(employeeData.hiredDate),
      is_active: true,
      total_vacation_days: employeeData.totalVacationDays,
      used_vacation_days: employeeData.usedVacationDays,
    },
  });
}

async function upsertLeaveBalances(employeeId: number) {
  for (const template of leaveBalanceTemplates) {
    const vacationType = await prisma.vacationType.findUnique({
      where: { code: template.code },
      select: { id: true },
    });

    if (!vacationType) {
      console.warn(`Skipping leave balance because vacation type not found: ${template.code}`);
      continue;
    }

    const remaining_days = Number(template.annual_quota) + Number(template.accrued_days) - Number(template.used_days);

    await prisma.leaveBalance.upsert({
      where: {
        employee_id_vacation_type_id_year: {
          employee_id: employeeId,
          vacation_type_id: vacationType.id,
          year: YEAR,
        },
      },
      update: {
        annual_quota: template.annual_quota,
        accrued_days: template.accrued_days,
        used_days: template.used_days,
        remaining_days,
        updated_at: new Date(),
      },
      create: {
        employee_id: employeeId,
        vacation_type_id: vacationType.id,
        year: YEAR,
        annual_quota: template.annual_quota,
        accrued_days: template.accrued_days,
        used_days: template.used_days,
        remaining_days,
      },
    });
  }
}

async function upsertPublicHolidays() {
  for (const holiday of holidayEntries) {
    const existing = await prisma.publicHoliday.findFirst({
      where: {
        holiday_date: new Date(holiday.holiday_date),
        country_code: holiday.country_code,
      },
    });

    if (existing) {
      await prisma.publicHoliday.update({
        where: { id: existing.id },
        data: {
          name: holiday.name,
        },
      });
    } else {
      await prisma.publicHoliday.create({
        data: {
          name: holiday.name,
          holiday_date: new Date(holiday.holiday_date),
          country_code: holiday.country_code,
        },
      });
    }
  }
}

async function main() {
  console.log('🌱 Starting official Prisma seed');

  const module = await import('../lib/prisma');
  prisma = module.prisma;

  await upsertDepartments();
  await upsertVacationTypes();

  const admin = await upsertUser(adminUser.email, adminUser.full_name, adminUser.role, adminUser.password);
  const demoUsersCreated = [] as Array<{ email: string; userId: number }>;

  for (const employee of demoEmployees) {
    const user = await upsertUser(employee.userEmail, employee.fullName, 'employee', employee.password);
    demoUsersCreated.push({ email: employee.userEmail, userId: user.id });
  }

  const demoEmployeesRecords = [] as Array<{ employeeCode: string; employeeId: number }>;

  for (const employee of demoEmployees) {
    const userId = demoUsersCreated.find((item) => item.email === employee.userEmail)?.userId;
    if (!userId) {
      throw new Error(`Could not locate user id for demo employee ${employee.userEmail}`);
    }
    const record = await upsertEmployee(employee, userId);
    demoEmployeesRecords.push({ employeeCode: employee.employeeCode, employeeId: record.id });
  }

  for (const record of demoEmployeesRecords) {
    await upsertLeaveBalances(record.employeeId);
  }

  await upsertPublicHolidays();

  console.log('✅ Prisma seed completed successfully');
  console.log('📝 Seeded records:');
  console.log(`   Departments: ${departments.length}`);
  console.log(`   Vacation types: ${vacationTypes.length}`);
  console.log(`   Demo employees: ${demoEmployees.length}`);
  console.log(`   Holidays: ${holidayEntries.length}`);
  console.log(`   Admin user: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
