import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings, saveAppSetting, removeAppSetting } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const settings = await getAppSettings();
    return NextResponse.json({ success: true, settings });
  } catch (err: unknown) {
    console.error('Error fetching settings:', err);
    return NextResponse.json({ success: false, message: '获取设置失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: '需要管理员权限' }, { status: 403 });
    }

    const { key, value, action } = await req.json();

    if (action === 'delete' && key) {
      await removeAppSetting(key);
      return NextResponse.json({ success: true, message: '设置已清除' });
    }

    if (!key) {
      return NextResponse.json({ success: false, message: '缺少设置键' }, { status: 400 });
    }

    await saveAppSetting(key, value || '');
    return NextResponse.json({ success: true, message: '设置保存成功' });
  } catch (err: unknown) {
    console.error('Error saving settings:', err);
    return NextResponse.json({ success: false, message: '保存设置失败' }, { status: 500 });
  }
}
