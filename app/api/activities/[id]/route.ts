import { NextRequest, NextResponse } from 'next/server';
import {
  getActivityById,
  deleteActivity,
  updateTeachingPlan,
  saveListeningNoteTemplate,
  pool,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activity = await getActivityById(Number(id));
    if (!activity) {
      return NextResponse.json({ success: false, message: '未找到该活动' }, { status: 404 });
    }
    return NextResponse.json({ success: true, activity });
  } catch (err: unknown) {
    console.error('Error fetching activity:', err);
    return NextResponse.json({ success: false, message: '获取活动详情失败' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: '需要管理员权限才能删除活动' }, { status: 403 });
    }

    const { id } = await params;
    await deleteActivity(Number(id));
    return NextResponse.json({ success: true, message: '活动已成功删除' });
  } catch (err: unknown) {
    console.error('Error deleting activity:', err);
    return NextResponse.json({ success: false, message: '删除活动失败' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const actId = Number(id);
    const body = await req.json();
    const { title, ai_teaching_plan, listening_notes_template, activity_date } = body;

    if (title || activity_date) {
      if (user.role !== 'admin') {
        return NextResponse.json({ success: false, message: '仅管理员可修改活动基本信息' }, { status: 403 });
      }
      if (title) {
        await pool.query('UPDATE activities SET title = $1 WHERE id = $2', [title.trim(), actId]);
      }
      if (activity_date) {
        await pool.query('UPDATE activities SET activity_date = $1 WHERE id = $2', [activity_date, actId]);
      }
    }

    if (typeof ai_teaching_plan === 'string') {
      await updateTeachingPlan(actId, ai_teaching_plan);
    }

    if (typeof listening_notes_template === 'string') {
      await saveListeningNoteTemplate(actId, listening_notes_template);
    }

    const updated = await getActivityById(actId);
    return NextResponse.json({ success: true, activity: updated });
  } catch (err: unknown) {
    console.error('Error updating activity:', err);
    return NextResponse.json({ success: false, message: '更新活动失败' }, { status: 500 });
  }
}
