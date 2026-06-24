#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { prisma } from '../lib/prisma';
const YEAR = 2026;
const DEFAULT_PASSWORD = 'TempPass123!';
const DEFAULT_POSITION = 'Employee';
const DEFAULT_HIRE_DATE = '2026-01-01';

type Args = {
  file?: string;
  apply: boolean;
};

type ParsedRow = {
  rowNumber: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentCode?: string;
  departmentName?: string;
  position?: string;
  hireDate?: string;
  password?: string;
  raw: Record<string, any>;
};

type ValidationError = {
  rowNumber: number;
  message: string;
};

type ImportRowResult = {
  rowNumber: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentCode?: string;
  departmentName?: string;
  position?: string;
  hireDate?: string;
  password?: string;
  valid: boolean;
  errors: ValidationError[];
  duplicateInFile: boolean;
  duplicateInDb: boolean;
  skippedExisting: boolean;
  departmentExists: boolean;
  action: 'import' | 'skip_existing' | 'skip_invalid';
};

function parseArgs(argv: string[]): Args {
  const args: Args = { apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--file') {
      args.file = argv[i + 1];
      i += 1;
    } else if (arg === '--apply') {
      args.apply = true;
    }
  }
  return args;
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  return String(value).trim();
}

function toDateString(value: unknown): string | undefined {
  if (!value) return undefined;
  const str = normalizeCell(value);
  if (!str) return undefined;
  if (str.includes('/')) {
    const [d, m, y] = str.split('/');
    if (d && m && y) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (str.includes('-')) return str;
  return undefined;
}

function buildColumnMap(headers: string[]): Record<string, string> {
  const normalized = headers.map((h) => normalizeCell(h).toLowerCase());
  const map: Record<string, string> = {};
  const aliases: Record<string, string[]> = {
    employeeCode: ['employeecode', 'employee code', 'code employe', 'code', 'employeecode'],
    firstName: ['firstname', 'first name', 'prénom', 'prenom', 'first_name'],
    lastName: ['lastname', 'last name', 'nom', 'last_name'],
    email: ['email', 'mail'],
    departmentCode: ['departmentcode', 'department code', 'code departement', 'deptcode', 'code_departement'],
    departmentName: ['departmentname', 'department name', 'departement', 'department', 'nom departement'],
    position: ['position', 'poste', 'fonction'],
    hireDate: ['hiredate', 'date embauche', 'hired date', 'date d embauche', 'embauche', 'hire_date'],
    password: ['password', 'mot de passe', 'pwd'],
  };

  for (const [field, candidates] of Object.entries(aliases)) {
    const found = normalized.findIndex((header) => candidates.includes(header));
    if (found >= 0) {
      map[field] = headers[found];
    }
  }
  return map;
}

function normalizeSheetName(name: string): string {
  return normalizeCell(name)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function detectSheetName(workbook: XLSX.WorkBook): string {
  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) return '';

  const matchingSheet = sheetNames.find((name) => {
    const normalized = normalizeSheetName(name);
    return (
      normalized === 'planning conge 2026' ||
      normalized === 'planing conge 2026' ||
      (normalized.includes('conge 2026') && (normalized.includes('planning') || normalized.includes('planing')))
    );
  });

  return matchingSheet || '';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error('Usage: pnpm exec tsx scripts/import-employees-from-excel.ts --file "path/to/file.xlsx" [--apply]');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), args.file);
  console.log('Import employees from Excel');
  console.log('Mode:', args.apply ? 'APPLY' : 'DRY-RUN');
  console.log('Excel file:', filePath);

  const workbook = XLSX.readFile(filePath);
  const sheetName = detectSheetName(workbook);
  if (!sheetName) {
    console.error('The workbook does not contain the required worksheet: PLANNING CONGE 2026');
    process.exit(1);
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];
  const headers = sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[] : [];

  console.log('Detected worksheets:', workbook.SheetNames.join(', '));
  console.log('Selected worksheet:', sheetName);
  console.log('Detected columns:', headers.join(' | '));

  const columnMap = buildColumnMap(headers);
  console.log('Column mapping:');
  for (const [field, column] of Object.entries(columnMap)) {
    console.log(` - ${field}: ${column || '<missing>'}`);
  }

  const requiredColumns = ['employeeCode', 'firstName', 'lastName', 'email'];
  const missingColumns = requiredColumns.filter((col) => !columnMap[col]);
  if (missingColumns.length > 0) {
    console.error('Missing critical columns:', missingColumns.join(', '));
    console.error('Dry-run blocked.');
    process.exit(1);
  }

  const parsedRows: ParsedRow[] = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    parsedRows.push({
      rowNumber,
      employeeCode: normalizeCell(row[columnMap.employeeCode]),
      firstName: normalizeCell(row[columnMap.firstName]),
      lastName: normalizeCell(row[columnMap.lastName]),
      email: normalizeCell(row[columnMap.email]),
      departmentCode: normalizeCell(row[columnMap.departmentCode] || row[columnMap.departmentName]),
      departmentName: normalizeCell(row[columnMap.departmentName]),
      position: normalizeCell(row[columnMap.position]) || DEFAULT_POSITION,
      hireDate: toDateString(row[columnMap.hireDate]) || DEFAULT_HIRE_DATE,
      password: normalizeCell(row[columnMap.password]),
      raw: row,
    });
  });

  const existingUsers = await prisma.user.findMany({ where: { email: { in: parsedRows.map((r) => r.email).filter(Boolean) } }, select: { id: true, email: true } });
  const existingEmployees = await prisma.employee.findMany({ where: { employee_id: { in: parsedRows.map((r) => r.employeeCode).filter(Boolean) } }, select: { id: true, employee_id: true } });
  const existingDepartments = await prisma.department.findMany({ select: { id: true, code: true, name: true } });

  const departmentByCode = new Map(existingDepartments.map((d) => [d.code.toLowerCase(), d]));
  const departmentByName = new Map(existingDepartments.map((d) => [d.name.toLowerCase(), d]));

  const seenInFile = new Map<string, number>();
  const results: ImportRowResult[] = [];

  for (const row of parsedRows) {
    const errors: ValidationError[] = [];
    const employeeCodeKey = row.employeeCode.toLowerCase();
    const emailKey = row.email.toLowerCase();

    if (!row.employeeCode) errors.push({ rowNumber: row.rowNumber, message: 'employeeCode is required' });
    if (!row.firstName) errors.push({ rowNumber: row.rowNumber, message: 'firstName is required' });
    if (!row.lastName) errors.push({ rowNumber: row.rowNumber, message: 'lastName is required' });
    if (!row.email) errors.push({ rowNumber: row.rowNumber, message: 'email is required' });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push({ rowNumber: row.rowNumber, message: 'email format is invalid' });

    const department = row.departmentCode ? departmentByCode.get(row.departmentCode.toLowerCase()) || departmentByName.get(row.departmentCode.toLowerCase()) : undefined;
    if (!row.departmentCode && !row.departmentName) {
      errors.push({ rowNumber: row.rowNumber, message: 'department is required' });
    } else if (!department) {
      errors.push({ rowNumber: row.rowNumber, message: `department not found: ${row.departmentCode || row.departmentName}` });
    }

    const duplicateInFile = seenInFile.has(employeeCodeKey) || seenInFile.has(emailKey);
    if (duplicateInFile) {
      errors.push({ rowNumber: row.rowNumber, message: 'duplicate in file' });
    }
    if (!duplicateInFile) {
      seenInFile.set(employeeCodeKey, row.rowNumber);
      seenInFile.set(emailKey, row.rowNumber);
    }

    const duplicateInDb = existingEmployees.some((emp) => emp.employee_id.toLowerCase() === row.employeeCode.toLowerCase()) || existingUsers.some((u) => u.email.toLowerCase() === row.email.toLowerCase());
    if (duplicateInDb) {
      errors.push({ rowNumber: row.rowNumber, message: 'already exists in DB' });
    }

    const valid = errors.length === 0;
    const action = duplicateInDb ? 'skip_existing' : valid ? 'import' : 'skip_invalid';

    results.push({
      rowNumber: row.rowNumber,
      employeeCode: row.employeeCode,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      departmentCode: row.departmentCode,
      departmentName: row.departmentName,
      position: row.position,
      hireDate: row.hireDate,
      password: row.password || DEFAULT_PASSWORD,
      valid,
      errors,
      duplicateInFile,
      duplicateInDb,
      skippedExisting: duplicateInDb,
      departmentExists: Boolean(department),
      action,
    });
  }

  const validRows = results.filter((r) => r.valid && !r.duplicateInDb);
  const invalidRows = results.filter((r) => !r.valid || r.duplicateInDb);
  const blocked = invalidRows.length > 0;

  console.log('\nSummary');
  console.log('Total rows:', results.length);
  console.log('Valid rows:', validRows.length);
  console.log('Invalid rows:', invalidRows.length);
  console.log('Rows with duplicates in file:', results.filter((r) => r.duplicateInFile).length);
  console.log('Rows already in DB:', results.filter((r) => r.duplicateInDb).length);
  console.log('Missing departments:', results.filter((r) => !r.departmentExists).length);
  console.log('Final status:', blocked ? 'BLOCKED' : 'READY_TO_IMPORT');

  console.log('\nValid rows:');
  validRows.forEach((r) => console.log(`- row ${r.rowNumber}: ${r.employeeCode} / ${r.email} / dept=${r.departmentCode || r.departmentName}`));

  console.log('\nInvalid rows:');
  invalidRows.forEach((r) => {
    console.log(`- row ${r.rowNumber}: ${r.employeeCode || '<empty>'} / ${r.email || '<empty>'}`);
    r.errors.forEach((e) => console.log(`   * ${e.message}`));
  });

  if (!args.apply) {
    console.log('\nDry-run completed. No changes were made.');
    console.log('To apply, run:');
    console.log('pnpm exec tsx scripts/import-employees-from-excel.ts --file "path/to/file.xlsx" --apply');
    await prisma.$disconnect();
    return;
  }

  if (blocked) {
    console.error('Apply blocked: critical errors found.');
    await prisma.$disconnect();
    process.exit(1);
  }

  const importedUsers: Array<{ email: string; password: string }> = [];
  const importedEmployees: Array<{ employeeCode: string; employeeId: number }> = [];
  const importedBalances: Array<{ employeeCode: string; year: number }> = [];

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        const department = existingDepartments.find((d) => d.code.toLowerCase() === (row.departmentCode || '').toLowerCase() || d.name.toLowerCase() === (row.departmentName || '').toLowerCase());
        if (!department) continue;

        const passwordHash = await bcrypt.hash(row.password || DEFAULT_PASSWORD, 10);
        const user = await tx.user.create({ data: { email: row.email, password_hash: passwordHash, full_name: `${row.firstName} ${row.lastName}`.trim(), role: 'employee', is_active: true } });
        const employee = await tx.employee.create({ data: { user_id: user.id, employee_id: row.employeeCode, department_id: department.id, position: row.position || DEFAULT_POSITION, hired_date: new Date(row.hireDate || DEFAULT_HIRE_DATE), is_active: true, total_vacation_days: 25, used_vacation_days: 0 } });
        await tx.leaveBalance.create({ data: { employee_id: employee.id, vacation_type_id: (await tx.vacationType.findFirst({ where: { code: 'annual_leave' } }))!.id, year: YEAR, annual_quota: 22, accrued_days: 5, used_days: 0, remaining_days: 27 } });

        importedUsers.push({ email: row.email, password: row.password || DEFAULT_PASSWORD });
        importedEmployees.push({ employeeCode: row.employeeCode, employeeId: employee.id });
        importedBalances.push({ employeeCode: row.employeeCode, year: YEAR });
      }
    });

    console.log('\nApply report');
    console.log('Users created:', importedUsers.length);
    console.log('Employees created:', importedEmployees.length);
    console.log('Leave balances created:', importedBalances.length);
    console.log('Ignored rows:', invalidRows.length);
    console.log('Errors:', invalidRows.flatMap((r) => r.errors.map((e) => `${r.rowNumber}:${e.message}`)).join(' | ') || 'none');
    console.log('Outcome: COMMITTED');
  } catch (error) {
    console.error('Apply failed; transaction rolled back.', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
