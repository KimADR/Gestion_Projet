import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT 
        id, 
        name, 
        code, 
        description, 
        requires_approval,
        color,
        excel_code,
        display_order
       FROM vacation_types 
       ORDER BY display_order, name`
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Get vacation types error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
