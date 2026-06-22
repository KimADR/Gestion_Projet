import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Registration via API is disabled. Create users via /dashboard/employees only.' },
    { status: 403 }
  );
}
