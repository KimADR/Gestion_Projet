import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vacationTypes = await prisma.vacationType.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        requires_approval: true,
        color: true,
        excel_code: true,
        display_order: true,
      },
      orderBy: [
        { display_order: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(vacationTypes);
  } catch (error) {
    console.error('Get vacation types error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
