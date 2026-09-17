import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { deleteUploadRecord, pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
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

    // 处理文件物理删除（本地磁盘或云端 Cloudinary）
    if (fileRecord.file_path) {
      if (fileRecord.file_path.startsWith('http')) {
        // 异步删除云端文件，不阻塞数据库记录删除
        deleteFromCloudinary(fileRecord.file_path).catch((e) => {
          console.warn('Failed to delete from Cloudinary:', e);
        });
      } else {
        try {
          const fullPath = path.join(process.cwd(), 'public', fileRecord.file_path);
          if (fs.existsSync(fullPath)) {
            await fs.promises.unlink(fullPath);
          }
        } catch (e) {
          console.warn('Could not delete disk file:', e);
        }
      }
    }

    // 从数据库删除
    await deleteUploadRecord(uploadId);

    return NextResponse.json({ success: true, message: '文件已成功删除' });
  } catch (err: unknown) {
    console.error('Delete upload error:', err);
    return NextResponse.json({ success: false, message: '删除文件失败' }, { status: 500 });
  }
}
