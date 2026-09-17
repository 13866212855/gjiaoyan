import { cookies, headers } from 'next/headers';

export interface UserSession {
  id: number;
  name: string;
  role: 'admin' | 'member';
}

const COOKIE_NAME = 'gpm_auth_session';

export function decodeSession(token: string): UserSession | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const data = JSON.parse(decoded);
    if (data && typeof data.name === 'string' && (data.role === 'admin' || data.role === 'member')) {
      return {
        id: Number(data.id) || 0,
        name: data.name,
        role: data.role,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function encodeSession(user: UserSession): string {
  return Buffer.from(JSON.stringify(user)).toString('base64');
}

export async function getCurrentUser(req?: Request): Promise<UserSession | null> {
  let token: string | undefined | null = null;

  // 1. Try explicit request headers if passed
  if (req) {
    const authHeader = req.headers.get('authorization') || req.headers.get('x-auth-token');
    if (authHeader) {
      token = authHeader.replace(/^Bearer\s+/i, '').trim();
    }
  }

  // 2. Try Next.js server headers()
  if (!token) {
    try {
      const headerStore = await headers();
      const authHeader = headerStore.get('authorization') || headerStore.get('x-auth-token');
      if (authHeader) {
        token = authHeader.replace(/^Bearer\s+/i, '').trim();
      }
    } catch {
      // ignore
    }
  }

  // 3. Try cookies()
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    } catch {
      // ignore
    }
  }

  if (!token) return null;
  return decodeSession(token);
}

export { COOKIE_NAME };
