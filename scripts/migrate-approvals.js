/**
 * Migration: Add rejection_reason and is_cancelled columns to approvals table
 * Enables proper rejection reason tracking and cancellation support
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔄 Running approvals migration...');

    // Add rejection_reason column if it doesn't exist
    const hasRejectionReason = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'approvals' AND column_name = 'rejection_reason'
      );
    `);

    if (!hasRejectionReason.rows[0].exists) {
      await client.query(`
        ALTER TABLE approvals 
        ADD COLUMN rejection_reason TEXT;
      `);
      console.log('✅ Added rejection_reason column');
    } else {
      console.log('⏭️  rejection_reason column already exists');
    }

    // Add is_cancelled column if it doesn't exist
    const hasIsCancelled = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'approvals' AND column_name = 'is_cancelled'
      );
    `);

    if (!hasIsCancelled.rows[0].exists) {
      await client.query(`
        ALTER TABLE approvals 
        ADD COLUMN is_cancelled BOOLEAN DEFAULT false;
      `);
      console.log('✅ Added is_cancelled column');
    } else {
      console.log('⏭️  is_cancelled column already exists');
    }

    // Add cancelled_at column if it doesn't exist
    const hasCancelledAt = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'approvals' AND column_name = 'cancelled_at'
      );
    `);

    if (!hasCancelledAt.rows[0].exists) {
      await client.query(`
        ALTER TABLE approvals 
        ADD COLUMN cancelled_at TIMESTAMP;
      `);
      console.log('✅ Added cancelled_at column');
    } else {
      console.log('⏭️  cancelled_at column already exists');
    }

    // Add cancellation_reason column if it doesn't exist
    const hasCancellationReason = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'approvals' AND column_name = 'cancellation_reason'
      );
    `);

    if (!hasCancellationReason.rows[0].exists) {
      await client.query(`
        ALTER TABLE approvals 
        ADD COLUMN cancellation_reason TEXT;
      `);
      console.log('✅ Added cancellation_reason column');
    } else {
      console.log('⏭️  cancellation_reason column already exists');
    }

    console.log('\n✨ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
