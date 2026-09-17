import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { addUploadRecord } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: '请先登录后再上传' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const activityIdStr = formData.get('activity_id') as string | null;
    const memberIdStr = formData.get('member_id') as string | null;
    const fileType = (formData.get('file_type') as string | null) || 'activity_photo';

    if (!file) {
      return NextResponse.json({ success: false, message: '请选择要上传的文件' }, { status: 400 });
    }

    if (!activityIdStr) {
      return NextResponse.json({ success: false, message: '缺少活动ID' }, { status: 400 });
    }

    const activityId = Number(activityIdStr);
    const memberId = memberIdStr ? Number(memberIdStr) : null;

    // 权限检查：成员只能上传自己的听课记录
    if (user.role === 'member') {
      if (fileType !== 'listening_note' || memberId !== user.id) {
        return NextResponse.json(
          { success: false, message: '普通成员仅能上传自己的听课记录' },
          { status: 403 }
        );
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name || 'upload.jpg';
    const safeType = fileType.replace(/[^a-zA-Z0-9_-]/g, '_');
    const isImage = fileType !== 'courseware_ppt' && !/\.(ppt|pptx|pdf|doc|docx|zip|rar)$/i.test(originalName);

    let finalFilePath = '';

    try {
      // 优先直接上传至 Cloudinary 永久云存储
      const folderName = `gengpeng_teaching/activity_${activityId}/${safeType}`;
      const uploadRes = await uploadToCloudinary(buffer, {
        folder: folderName,
        resource_type: isImage ? 'image' : 'auto',
      });
      finalFilePath = uploadRes.secure_url;
      console.log('Cloudinary upload success:', finalFilePath);
    } catch (cloudErr) {
      console.error('Cloudinary upload failed, falling back to local disk:', cloudErr);
      
      // 本地回退保存
      const relativeDir = path.join('uploads', 'activities', String(activityId), safeType);
      const absoluteDir = path.join(process.cwd(), 'public', relativeDir);
      await fs.promises.mkdir(absoluteDir, { recursive: true });

      const timestamp = Math.floor(Date.now() / 1000);
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const diskFileName = `${timestamp}_${sanitizedName}`;
      const absoluteFilePath = path.join(absoluteDir, diskFileName);
      await fs.promises.writeFile(absoluteFilePath, buffer);
      finalFilePath = path.join(relativeDir, diskFileName).replace(/\\/g, '/');
    }

    // 写入数据库
    const record = await addUploadRecord({
      activity_id: activityId,
      member_id: memberId,
      file_type: fileType,
      file_name: originalName,
      file_path: finalFilePath,
    });

    return NextResponse.json({
      success: true,
      message: '文件上传成功已存储至云端',
      upload: record,
    });
  } catch (err: unknown) {
    console.error('Upload error:', err);
    return NextResponse.json({ success: false, message: '文件上传失败，请重试' }, { status: 500 });
  }
}
