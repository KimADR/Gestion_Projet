#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  return String(value).trim();
}

function normalizeSheetName(name: string): string {
  return normalizeCell(name)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function detectSheetName(workbook: XLSX.WorkBook): string | undefined {
  const allowedTargets = ['planning conge 2026', 'planing conge 2026'];
  const matching = workbook.SheetNames.find((name) => {
    const normalized = normalizeSheetName(name);
    return allowedTargets.includes(normalized);
  });

  return matching;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const cleaned = normalizeCell(fullName).replace(/\s+/g, ' ').trim();
  if (!cleaned) return { firstName: '', lastName: '' };

  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    const isLikelyReliable = parts.length === 2 && parts.every((part) => part.length >= 2);
    if (isLikelyReliable) {
      return {
        firstName: parts[0],
        lastName: parts[1],
      };
    }
  }

  return { firstName: '', lastName: '' };
}

function isLikelyEmployeeRow(row: unknown[]): boolean {
  const values = row.map((value) => normalizeCell(value));
  const hasPoste = values[0] && values[0].toLowerCase() !== 'poste';
  const hasEmployeeName = values[2] && values[2].toLowerCase() !== 'employés' && values[2].toLowerCase() !== 'employe' && values[2].toLowerCase() !== 'employés';
  const hasDepartment = Boolean(values[1]);
  return hasPoste && hasEmployeeName && hasDepartment;
}

function buildTemplateRows(rows: unknown[][]): Array<Record<string, string>> {
  const templateRows: Array<Record<string, string>> = [];
  rows.forEach((row, index) => {
    if (!isLikelyEmployeeRow(row)) return;

    const sourceRow = String(index + 1);
    const sourceName = normalizeCell(row[2]);
    const departmentName = normalizeCell(row[1]);
    const position = normalizeCell(row[0]);
    const { firstName, lastName } = splitName(sourceName);
    const notes = firstName || lastName
      ? 'Split firstName/lastName manually if needed.'
      : 'Split firstName/lastName manually. Default password strategy must be decided manually.';

    templateRows.push({
      sourceRow,
      sourceName,
      employeeCode: '',
      firstName,
      lastName,
      email: '',
      departmentName,
      position,
      hireDate: '',
      password: '',
      importStatus: 'TO_COMPLETE',
      notes,
    });
  });

  return templateRows;
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: pnpm exec tsx scripts/generate-employee-import-template.ts "path/to/file.xlsx"');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), fileArg);
  const outputDir = path.resolve(process.cwd(), 'exports');
  const outputPath = path.join(outputDir, 'employee-import-template.xlsx');

  fs.mkdirSync(outputDir, { recursive: true });

  console.log('Generating employee import template');
  console.log('Input file:', inputPath);
  console.log('Output file:', outputPath);

  const workbook = XLSX.readFile(inputPath);
  const sheetName = detectSheetName(workbook);
  if (!sheetName) {
    console.error('Required sheet not found. Allowed sheets: PLANING CONGE 2026, PLANNING CONGE 2026');
    console.error('Available sheets:', workbook.SheetNames.join(', '));
    process.exit(1);
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.error('Required sheet not found.');
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
  const templateRows = buildTemplateRows(rows);

  const headers = [
    'sourceRow',
    'sourceName',
    'employeeCode',
    'firstName',
    'lastName',
    'email',
    'departmentName',
    'position',
    'hireDate',
    'password',
    'importStatus',
    'notes',
  ];

  const worksheetData = [headers, ...templateRows.map((row) => headers.map((header) => row[header] ?? ''))];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbookOut = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbookOut, worksheet, 'employee_import_template');

  const readmeRows = [
    ['README', ''],
    ['Instructions', ''],
    ['- Complete employeeCode', ''],
    ['- Complete firstName', ''],
    ['- Complete lastName', ''],
    ['- Complete email', ''],
    ['- Verify departmentName', ''],
    ['- Verify position', ''],
    ['- Complete hireDate', ''],
    ['- Choose or generate a password', ''],
    ['- Do not modify sourceRow or sourceName', ''],
    ['- Do not delete technical columns', ''],
    ['- Re-run the dry-run before import', ''],
  ];
  const readmeSheet = XLSX.utils.aoa_to_sheet(readmeRows);
  XLSX.utils.book_append_sheet(workbookOut, readmeSheet, 'README');

  XLSX.writeFile(workbookOut, outputPath);

  console.log('\nSummary');
  console.log('Extracted employee candidates:', templateRows.length);
  console.log('Extracted employees:');
  templateRows.forEach((row) => {
    console.log(`- row ${row.sourceRow}: ${row.sourceName} | dept=${row.departmentName} | position=${row.position}`);
  });
  console.log('Generated file:', outputPath);
  console.log('Pre-filled fields: sourceRow, sourceName, departmentName, position, and firstName/lastName only when clearly reliable');
  console.log('Fields to complete: employeeCode, firstName, lastName, email, hireDate, password, and any uncertain values');
  console.log('Database changes: none');
  console.log('Conclusion: TEMPLATE_GENERATED');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
