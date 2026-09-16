import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { encodeSession, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, message: '请输入用户名和密码' }, { status: 400 });
    }

    const trimmedUser = username.trim();

    // 1. 管理员登录
    if (trimmedUser === 'admin' && password === 'admin123') {
      const user = { id: 0, name: '管理员', role: 'admin' as const };
      const token = encodeSession(user);

      const response = NextResponse.json({ success: true, user });
      response.cookies.set(COOKIE_NAME, token, {
        path: '/',
        httpOnly: false, // 允许前端JS读取提升交互体验
        maxAge: 60 * 60 * 24 * 30, // 30天
        sameSite: 'lax',
      });
      return response;
    }

    // 2. 成员姓名登录 (密码默认 123456)
    if (password === '123456') {
      const res = await pool.query('SELECT * FROM members WHERE name = $1 LIMIT 1', [trimmedUser]);
      if (res.rows.length > 0) {
        const member = res.rows[0];
        const user = { id: member.id, name: member.name, role: 'member' as const };
        const token = encodeSession(user);

        const response = NextResponse.json({ success: true, user });
        response.cookies.set(COOKIE_NAME, token, {
          path: '/',
          httpOnly: false,
          maxAge: 60 * 60 * 24 * 30,
          sameSite: 'lax',
        });
        return response;
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: '用户名或密码错误。管理员账号: admin / admin123；教师账号为姓名，初始密码: 123456',
      },
      { status: 401 }
    );
  } catch (err: unknown) {
    console.error('Login error:', err);
    return NextResponse.json({ success: false, message: '服务器异常，请稍后重试' }, { status: 500 });
  }
}
