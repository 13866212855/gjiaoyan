import { NextRequest, NextResponse } from 'next/server';
import {
  getLlmConfigs,
  addLlmConfig,
  setActiveLlmConfig,
  deleteLlmConfig,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const configs = await getLlmConfigs();
    return NextResponse.json({ success: true, configs });
  } catch (err: unknown) {
    console.error('Error fetching LLM configs:', err);
    return NextResponse.json({ success: false, message: '获取大模型配置失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: '需要管理员权限' }, { status: 403 });
    }

    const { name, base_url, api_key, model_name, is_active } = await req.json();

    if (!name || !base_url || !api_key || !model_name) {
      return NextResponse.json({ success: false, message: '请填写完整的配置信息' }, { status: 400 });
    }

    const config = await addLlmConfig({
      name,
      base_url,
      api_key,
      model_name,
      is_active: is_active ? 1 : 0,
    });

    if (is_active) {
      await setActiveLlmConfig(config.id);
    }

    return NextResponse.json({ success: true, config });
  } catch (err: unknown) {
    console.error('Error adding LLM config:', err);
    return NextResponse.json({ success: false, message: '添加大模型配置失败' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: '需要管理员权限' }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, message: '缺少配置ID' }, { status: 400 });
    }

    await setActiveLlmConfig(Number(id));
    return NextResponse.json({ success: true, message: '已激活该模型配置' });
  } catch (err: unknown) {
    console.error('Error activating LLM config:', err);
    return NextResponse.json({ success: false, message: '激活配置失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: '需要管理员权限' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少配置ID' }, { status: 400 });
    }

    await deleteLlmConfig(Number(id));
    return NextResponse.json({ success: true, message: '配置已删除' });
  } catch (err: unknown) {
    console.error('Error deleting LLM config:', err);
    return NextResponse.json({ success: false, message: '删除配置失败' }, { status: 500 });
  }
}
