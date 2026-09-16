import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { deleteUploadRecord, pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const uploadId = Number(id);

    // 查询原记录
    const res = await pool.query('SELECT * FROM uploads WHERE id = $1', [uploadId]);
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, message: '未找到该文件记录' }, { status: 404 });
    }

    const fileRecord = res.rows[0];

    // 权限检查
    if (user.role !== 'admin' && fileRecord.member_id !== user.id) {
      return NextResponse.json({ success: false, message: '无权删除该文件' }, { status: 403 });
    }

    // 从磁盘删除物理文件（如果存在）
    try {
      const fullPath = path.join(process.cwd(), 'public', fileRecord.file_path);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
    } catch (e) {
      console.warn('Could not delete disk file:', e);
    }

    // 从数据库删除
    await deleteUploadRecord(uploadId);

    return NextResponse.json({ success: true, message: '文件已删除' });
  } catch (err: unknown) {
    console.error('Delete upload error:', err);
    return NextResponse.json({ success: false, message: '删除文件失败' }, { status: 500 });
  }
}
