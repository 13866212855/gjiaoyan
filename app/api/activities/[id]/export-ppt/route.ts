import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import pptxgen from 'pptxgenjs';
import { getActivityById } from '@/lib/db';

async function getBase64Image(filePath: string | undefined | null): Promise<string | null> {
  if (!filePath) return null;
  const clean = filePath.replace(/^\//, '');
  const disk = path.join(process.cwd(), 'public', clean);
  try {
    if (fs.existsSync(disk)) {
      const buf = await fs.promises.readFile(disk);
      const ext = path.extname(clean).toLowerCase().replace('.', '');
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      return `data:${mime};base64,${buf.toString('base64')}`;
    }
  } catch (err) {
    console.error('Failed to read image disk file:', filePath, err);
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || isNaN(activityId)) {
      return NextResponse.json({ success: false, message: '无效的活动ID' }, { status: 400 });
    }

    const activity = await getActivityById(activityId);
    if (!activity) {
      return NextResponse.json({ success: false, message: '未找到对应教研活动' }, { status: 404 });
    }

    // 筛选活动所需的4张核心图片：2张现场照片、1张签到表、1张总结图
    const photos = activity.uploads?.filter((u) => u.file_type === 'activity_photo') || [];
    const attendanceUpload = activity.uploads?.find((u) => u.file_type === 'attendance_sheet');
    const summaryUpload = activity.uploads?.find((u) => u.file_type === 'summary_image');

    const photo1 = photos[0] || null;
    const photo2 = photos[1] || null;

    // 转换为Base64
    const photo1Base64 = await getBase64Image(photo1?.file_path);
    const photo2Base64 = await getBase64Image(photo2?.file_path);
    const attendanceBase64 = await getBase64Image(attendanceUpload?.file_path);
    const summaryBase64 = await getBase64Image(summaryUpload?.file_path);

    // 听课教师名单汇总
    const listenerNames =
      activity.listeners && activity.listeners.length > 0
        ? activity.listeners.map((l) => l.name).join('、')
        : '全体信息技术教研组成员';

    // 初始化 PPTX 生成器（16:9 标准宽屏）
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9'; // 10.0 x 5.625 inches
    pptx.title = `耿棚中学教研活动总结_${activity.title}`;
    pptx.subject = '耿棚中学信息技术教研活动单页总结PPT';
    pptx.author = '颍上县耿棚中学信息技术教研组';

    const slide = pptx.addSlide();
    slide.background = { color: 'F8F9FC' };

    // 1. 顶部学校名称与活动总结横幅
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10.0,
      h: 0.82,
      fill: { color: '4A3E8F' },
      line: { color: '4A3E8F', width: 0 },
    });
    // 金色装饰细线
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0.82,
      w: 10.0,
      h: 0.04,
      fill: { color: 'E5A83B' },
      line: { color: 'E5A83B', width: 0 },
    });

    slide.addText('颍上县耿棚中学信息技术教研活动总结', {
      x: 0.45,
      y: 0.16,
      w: 6.8,
      h: 0.45,
      fontSize: 18,
      bold: true,
      color: 'FFFFFF',
      fontFace: 'Microsoft YaHei',
    });

    slide.addText('教研成果归档 · 单页总结汇报', {
      x: 7.0,
      y: 0.22,
      w: 2.5,
      h: 0.35,
      fontSize: 10,
      color: 'D8D4F2',
      align: 'right',
      fontFace: 'Microsoft YaHei',
    });

    // 2. 活动核心信息栏（主题、执教人、日期、听课人员）
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45,
      y: 0.96,
      w: 9.1,
      h: 0.36,
      fill: { color: 'EFEFF8' },
      line: { color: 'D1D1EB', width: 1 },
    });

    const infoSummary = `【活动主题】${activity.title}   |   【执教教师】${activity.instructor_name || '授课教师'}   |   【活动日期】${activity.activity_date}   |   【听课人员】${listenerNames}`;
    slide.addText(infoSummary, {
      x: 0.55,
      y: 0.96,
      w: 8.9,
      h: 0.36,
      fontSize: 9.5,
      color: '2D2B52',
      fontFace: 'Microsoft YaHei',
      valign: 'middle',
    });

    // 3. 4张图片卡片矩阵布局定义（2行 x 2列）
    // 左列 x = 0.45, 右列 x = 5.15, 卡片宽度 w = 4.40
    // 第一行 y = 1.40, 第二行 y = 3.28, 卡片总高度 h = 1.76
    const cards = [
      {
        title: '【现场照片一】课堂教学实况',
        badgeColor: '5B52A3',
        x: 0.45,
        y: 1.40,
        w: 4.40,
        h: 1.76,
        base64: photo1Base64,
        emptyTip: '【现场照片一】待补充上传',
      },
      {
        title: '【现场照片二】互动与评课实况',
        badgeColor: '5B52A3',
        x: 5.15,
        y: 1.40,
        w: 4.40,
        h: 1.76,
        base64: photo2Base64,
        emptyTip: '【现场照片二】待补充上传',
      },
      {
        title: '【活动签到】教研活动实名签到表',
        badgeColor: '059669',
        x: 0.45,
        y: 3.28,
        w: 4.40,
        h: 1.76,
        base64: attendanceBase64,
        emptyTip: '【签到表】待补充上传',
      },
      {
        title: '【活动总结】教研总结与反思评价表',
        badgeColor: '4338CA',
        x: 5.15,
        y: 3.28,
        w: 4.40,
        h: 1.76,
        base64: summaryBase64,
        emptyTip: '【总结图】待补充上传',
      },
    ];

    for (const card of cards) {
      // 标题栏背景
      slide.addShape(pptx.ShapeType.rect, {
        x: card.x,
        y: card.y,
        w: card.w,
        h: 0.28,
        fill: { color: card.badgeColor },
        line: { color: card.badgeColor, width: 0 },
      });

      // 标题文本
      slide.addText(card.title, {
        x: card.x + 0.1,
        y: card.y,
        w: card.w - 0.2,
        h: 0.28,
        fontSize: 9.5,
        bold: true,
        color: 'FFFFFF',
        fontFace: 'Microsoft YaHei',
        valign: 'middle',
      });

      // 图片内容区白色边框卡片
      const imgAreaY = card.y + 0.28;
      const imgAreaH = card.h - 0.28;

      slide.addShape(pptx.ShapeType.rect, {
        x: card.x,
        y: imgAreaY,
        w: card.w,
        h: imgAreaH,
        fill: { color: 'FFFFFF' },
        line: { color: 'E2E4E9', width: 1 },
      });

      if (card.base64) {
        // 内嵌真实图片（保持比例居中容纳在容器内）
        slide.addImage({
          data: card.base64,
          x: card.x + 0.06,
          y: imgAreaY + 0.05,
          w: card.w - 0.12,
          h: imgAreaH - 0.1,
          sizing: {
            type: 'contain',
            w: card.w - 0.12,
            h: imgAreaH - 0.1,
          },
        });
      } else {
        // 占位提示文案
        slide.addText(card.emptyTip, {
          x: card.x,
          y: imgAreaY,
          w: card.w,
          h: imgAreaH,
          fontSize: 9,
          color: '9CA3AF',
          align: 'center',
          valign: 'middle',
          fontFace: 'Microsoft YaHei',
        });
      }
    }

    // 4. 底部微型标注
    slide.addText('颍上县耿棚中学信息技术教研组 · 数字化校本教研纪实档案', {
      x: 0.45,
      y: 5.24,
      w: 9.1,
      h: 0.26,
      fontSize: 8.5,
      color: '8A8A9E',
      align: 'center',
      valign: 'middle',
      fontFace: 'Microsoft YaHei',
    });

    // 生成 PPTX 二进制 Buffer
    const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;

    const safeTitle = activity.title.replace(/[\\/:*?"<>|]/g, '_');
    const filename = `耿棚中学教研活动总结_${activity.activity_date}_${safeTitle}.pptx`;
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: unknown) {
    console.error('Export PPT error:', err);
    return NextResponse.json(
      { success: false, message: '生成PPT时发生异常，请检查上传文件或稍后重试' },
      { status: 500 }
    );
  }
}
