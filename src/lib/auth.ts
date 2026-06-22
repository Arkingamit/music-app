import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { User } from '@/lib/types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// Create a JWT token for a user
export function createToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify and decode a JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Extract the authenticated user from a request's cookies or Authorization header
export function getAuthUser(request: NextRequest): JWTPayload | null {
  // First, check for HttpOnly cookie (production secure method)
  let token = request.cookies.get('token')?.value;

  // Fallback to Authorization header (for backward compatibility / testing)
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return null;
  }
  return verifyToken(token);
}

// Helper to create JSON error responses
export function authError(message: string, status = 401) {
  return Response.json({ error: message }, { status });
}
