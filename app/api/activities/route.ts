import { NextRequest, NextResponse } from 'next/server';
import {
  getActivities,
  createActivity,
  getAppSettings,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get('show_all') === 'true';

    const settings = await getAppSettings();
    const hideBeforeDate = settings['hide_before_date'] || null;

    const activities = await getActivities({
      hideBeforeDate,
      tempShowAll: showAll,
    });

    return NextResponse.json({
      success: true,
      activities,
      hideBeforeDate,
      isFiltered: Boolean(hideBeforeDate && !showAll),
    });
  } catch (err: unknown) {
    console.error('Error fetching activities:', err);
    return NextResponse.json({ success: false, message: '获取活动列表失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: '需要管理员权限才能创建活动' }, { status: 403 });
    }

    const body = await req.json();
    const { title, instructor_id, activity_date, listener_ids, ai_teaching_plan, ai_listening_note } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, message: '活动主题不能为空' }, { status: 400 });
    }

    if (!instructor_id) {
      return NextResponse.json({ success: false, message: '请选择授课人' }, { status: 400 });
    }

    if (!activity_date) {
      return NextResponse.json({ success: false, message: '请选择活动日期' }, { status: 400 });
    }

    const activity = await createActivity({
      title: title.trim(),
      instructor_id: Number(instructor_id),
      activity_date,
      listener_ids: Array.isArray(listener_ids) ? listener_ids.map(Number) : [],
      ai_teaching_plan: ai_teaching_plan || '',
      ai_listening_note: ai_listening_note || '',
    });

    return NextResponse.json({ success: true, activity });
  } catch (err: unknown) {
    console.error('Error creating activity:', err);
    return NextResponse.json({ success: false, message: '创建活动失败' }, { status: 500 });
  }
}
