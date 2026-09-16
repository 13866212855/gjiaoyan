import { cookies } from 'next/headers';

export interface UserSession {
  id: number;
  name: string;
  role: 'admin' | 'member';
}

const COOKIE_NAME = 'gpm_auth_session';

export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf-8');
    const data = JSON.parse(decoded);
    if (data && data.name && (data.role === 'admin' || data.role === 'member')) {
      return data as UserSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function encodeSession(user: UserSession): string {
  return Buffer.from(JSON.stringify(user)).toString('base64');
}

export { COOKIE_NAME };
