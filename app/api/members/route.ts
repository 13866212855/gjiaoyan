import { NextRequest, NextResponse } from 'next/server';
import {
  getMembers,
  addMember,
  updateMemberName,
  replaceMemberWithNew,
  setMemberStatus,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'active' | 'inactive' | null;
    const members = await getMembers(status || undefined);
    return NextResponse.json({ success: true, members });
  } catch (err: unknown) {
    console.error('Error fetching members:', err);
    return NextResponse.json({ success: false, message: '获取成员列表失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: '需要管理员权限' }, { status: 403 });
    }

    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: '成员姓名不能为空' }, { status: 400 });
    }

    const member = await addMember(name.trim());
    return NextResponse.json({ success: true, member });
  } catch (err: unknown) {
    console.error('Error adding member:', err);
    return NextResponse.json({ success: false, message: '添加成员失败' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: '需要管理员权限' }, { status: 403 });
    }

    const body = await req.json();
    const { action, id, name, newName } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少成员ID' }, { status: 400 });
    }

    if (action === 'rename') {
      if (!name || !name.trim()) {
        return NextResponse.json({ success: false, message: '新姓名不能为空' }, { status: 400 });
      }
      const updated = await updateMemberName(Number(id), name.trim());
      return NextResponse.json({ success: true, member: updated });
    }

    if (action === 'replace') {
      if (!newName || !newName.trim()) {
        return NextResponse.json({ success: false, message: '新成员姓名不能为空' }, { status: 400 });
      }
      const result = await replaceMemberWithNew(Number(id), newName.trim());
      return NextResponse.json({ success: true, result });
    }

    if (action === 'retire') {
      const updated = await setMemberStatus(Number(id), 'inactive');
      return NextResponse.json({ success: true, member: updated });
    }

    if (action === 'restore') {
      const updated = await setMemberStatus(Number(id), 'active');
      return NextResponse.json({ success: true, member: updated });
    }

    return NextResponse.json({ success: false, message: '未知操作类型' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Error updating member:', err);
    return NextResponse.json({ success: false, message: '更新成员失败' }, { status: 500 });
  }
}
