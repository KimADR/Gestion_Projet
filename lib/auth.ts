import { NextRequest } from 'next/server';
import * as jwt from 'jsonwebtoken';

export interface AuthUser {
  userId: number;
  email: string;
  role: string;
  employeeId?: string;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured. Set JWT_SECRET in the environment.');
  }
  return secret;
}

export async function verifyAuth(req: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, getJwtSecret()) as AuthUser;
    return decoded;
  } catch (error) {
    return null;
  }
}
