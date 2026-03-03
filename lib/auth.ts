import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export interface JwtPayload {
  id: string;
  email: string;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function verifyAuth(req: NextRequest): Promise<{ userId: string; email: string } | null> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return null;
    }

    return { userId: decoded.id, email: decoded.email };
  } catch (error) {
    return null;
  }
}

export function generateErrorResponse(message: string, statusCode: number = 400) {
  return new Response(
    JSON.stringify({ success: false, message }),
    { status: statusCode, headers: { 'Content-Type': 'application/json' } }
  );
}

export function generateSuccessResponse(data: any, statusCode: number = 200) {
  return new Response(
    JSON.stringify({ success: true, data }),
    { status: statusCode, headers: { 'Content-Type': 'application/json' } }
  );
}

