#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import { resolve } from 'path';
// Load environment from project root .env.local if present
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Create a local PrismaClient using DATABASE_URL to avoid adapter-related auth issues
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type Args = {
  apply: boolean;
  force: boolean;
  restoreBalances: boolean;
};

function parseArgs(): Args {
  const raw = process.argv.slice(2);
  return {
    apply: raw.includes('--apply'),
    force: raw.includes('--force'),
    restoreBalances: raw.includes('--restore-balances'),
  };
}

async function main() {
  const args = parseArgs();

  console.log('Cleanup test data script');
  console.log('Mode:', args.apply ? 'APPLY' : 'DRY-RUN');
  if (args.apply) console.log('Force approved deletions:', args.force ? 'yes' : 'no');
  if (args.apply && args.restoreBalances) console.log('Will restore balances for approved requests');

  // Selection criteria (case-insensitive)
  const patterns = [
    { startsWith: 'Audit' },
    { contains: 'Holiday exclusion' },
    { contains: 'Runtime validation' },
    { contains: 'Half-day runtime' },
    { contains: 'test' },
    { contains: 'validation' },
  ];

  // Build SQL WHERE clause from patterns
  // (patterns list above mirrors the Prisma selection intent)
    // Build SQL WHERE clause from patterns
    const whereClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;
    for (const p of ['Audit', 'Holiday exclusion', 'Runtime validation', 'Half-day runtime', 'test', 'validation']) {
      whereClauses.push(`reason ILIKE $${idx}`);
      params.push(`%${p}%`);
      idx++;
    }
    // also include startsWith Audit specifically
    // (already covered by %Audit% but keep it simple)

    const requestsSql = `SELECT id, employee_id, vacation_type_id, start_date, end_date, days_requested, reason, status FROM vacation_requests WHERE ${whereClauses.join(' OR ')} ORDER BY created_at ASC`;
    const res = await pool.query(requestsSql, params);
    const requests = res.rows;

  if (requests.length === 0) {
    console.log('No matching test vacation requests found. Nothing to do.');
    await pool.end();
    return;
  }

  const ids = requests.map((r) => r.id);

  const approvalsRes = await pool.query(`SELECT id, vacation_request_id, approved FROM approvals WHERE vacation_request_id = ANY($1::int[])`, [ids]);
  const approvals = approvalsRes.rows;

  const approvedRequests = requests.filter((r) => r.status === 'approved');

  console.log(`Found ${requests.length} vacation_request(s) matching criteria.`);
  console.log(`Found ${approvals.length} approval(s) linked to those requests.`);
  if (approvedRequests.length > 0) {
    console.log(`WARNING: ${approvedRequests.length} request(s) are in 'approved' status:`);
    approvedRequests.forEach((r) => console.log(` - id=${r.id} employee_id=${r.employee_id} days=${r.days_requested} reason=${r.reason}`));
    console.log('Deleting approved requests may leave leave balances inconsistent.');
    console.log('To proceed with deletion of approved requests use --apply --force.');
    console.log('Optionally add --restore-balances to automatically restore leave balances (reverse approval consumption).');
    console.log('\nIf you want to run the deletion with restore, use:');
    console.log('pnpm exec tsx scripts/cleanup-test-data.ts --apply --force --restore-balances');
  }

  console.log('\nPreview list of vacation requests to be removed:');
  requests.forEach((r) => console.log(`- id=${r.id} status=${r.status} start=${r.start_date?.toISOString().split('T')[0]} end=${r.end_date?.toISOString().split('T')[0]} days=${r.days_requested} reason=${r.reason}`));

  if (!args.apply) {
    console.log('\nDry-run mode: no changes applied.');
    console.log('To apply these changes run:');
    console.log('pnpm exec tsx scripts/cleanup-test-data.ts --apply --force --restore-balances');
    await pool.end();
    return;
  }

  // If apply and there are approved requests but not forced, abort.
  if (approvedRequests.length > 0 && !args.force) {
    console.error('\nAborting: approved requests detected. Re-run with --apply --force to delete them, and optionally --restore-balances to restore leave balances.');
    await pool.end();
    process.exit(2);
  }

  // Perform SQL transaction (see below)
  let result: { restored: number; deletedApprovals: number; deletedRequests: number } = { restored: 0, deletedApprovals: 0, deletedRequests: 0 };
    if (args.apply) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Restore balances for approved requests if requested
        if (args.restoreBalances && approvedRequests.length > 0) {
          for (const r of approvedRequests) {
            const balanceYear = new Date(r.start_date).getFullYear();
            const daysRequested = Number(r.days_requested || 0);
            if (daysRequested <= 0) continue;
            await client.query(
              `UPDATE leave_balances
               SET used_days = GREATEST(0, used_days - $1),
                   remaining_days = annual_quota + accrued_days - GREATEST(0, used_days - $1),
                   updated_at = CURRENT_TIMESTAMP
               WHERE employee_id = $2 AND vacation_type_id = $3 AND year = $4`,
              [daysRequested, r.employee_id, r.vacation_type_id, balanceYear]
            );
            result.restored++;
          }
        }

        const delApp = await client.query(`DELETE FROM approvals WHERE vacation_request_id = ANY($1::int[]) RETURNING id`, [ids]);
        result.deletedApprovals = delApp.rowCount;

        const delReq = await client.query(`DELETE FROM vacation_requests WHERE id = ANY($1::int[]) RETURNING id`, [ids]);
        result.deletedRequests = delReq.rowCount;

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

  console.log(`\nApply complete: approvals deleted=${result.deletedApprovals}, vacation_requests deleted=${result.deletedRequests}, balances restored=${result.restored}`);
  await pool.end();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await pool.end();
  process.exit(1);
});
