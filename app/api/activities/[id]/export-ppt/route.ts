import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import pptxgen from 'pptxgenjs';
import JSZip from 'jszip';
import { getActivityById, Activity } from '@/lib/db';

async function getBase64Image(filePath: string | undefined | null): Promise<string | null> {
  if (!filePath) return null;
  const trimmed = filePath.trim();

  // 1. 支持远程 Cloudinary HTTPS 图片链接
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const res = await fetch(trimmed);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        return `data:${contentType};base64,${buf.toString('base64')}`;
      }
    } catch (err) {
      console.error('Failed to fetch remote image for PPT:', trimmed, err);
    }
  }

  // 2. 如果已经是 Data URL
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // 3. 本地磁盘回退读取
  const clean = trimmed.replace(/^\//, '');
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

/**
 * 构建针对手机端查看优化的全新单页 PPTX（16:9 宽屏）
 * 排版规则：
 * 1. 2张现场照片缩小且垂直上下排列（占左侧列，总面积与签到表相当）
 * 2. 全员实名签到表独立占据中列，大幅展示，图片充满区域无黑白边
 * 3. 评课反馈与反思总结独立占据右列，大幅展示，图片充满区域无黑白边
 */
async function generateSingleSlidePptx(activity: Activity): Promise<Buffer> {
  const photos = activity.uploads?.filter((u) => u.file_type === 'activity_photo') || [];
  const attendanceUpload = activity.uploads?.find((u) => u.file_type === 'attendance_sheet');
  const summaryUpload = activity.uploads?.find((u) => u.file_type === 'summary_image');

  const photo1 = photos[0] || null;
  const photo2 = photos[1] || null;

  // 转换为 Base64
  const photo1Base64 = await getBase64Image(photo1?.file_path);
  const photo2Base64 = await getBase64Image(photo2?.file_path);
  const attendanceBase64 = await getBase64Image(attendanceUpload?.file_path);
  const summaryBase64 = await getBase64Image(summaryUpload?.file_path);

  // 听课教师名单汇总
  const listenerNames =
    activity.listeners && activity.listeners.length > 0
      ? activity.listeners.map((l) => l.name).join('、')
      : '全体信息技术教研组成员';

  // 初始化 PPTX 生成器（16:9 标准宽屏 10.0 x 5.625 英寸）
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
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
    h: 0.62,
    fill: { color: '4A3E8F' },
    line: { color: '4A3E8F', width: 0 },
  });
  // 金色装饰细线
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0.62,
    w: 10.0,
    h: 0.03,
    fill: { color: 'E5A83B' },
    line: { color: 'E5A83B', width: 0 },
  });

  slide.addText('颍上县耿棚中学信息技术教研活动总结', {
    x: 0.35,
    y: 0.12,
    w: 6.8,
    h: 0.42,
    fontSize: 17,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Microsoft YaHei',
  });

  slide.addText('教研成果归档 · 单页总结汇报', {
    x: 7.0,
    y: 0.16,
    w: 2.65,
    h: 0.35,
    fontSize: 9.5,
    color: 'D8D4F2',
    align: 'right',
    fontFace: 'Microsoft YaHei',
  });

  // 2. 活动核心信息栏（主题、执教人、日期、听课人员）
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.35,
    y: 0.73,
    w: 9.3,
    h: 0.33,
    fill: { color: 'EFEFF8' },
    line: { color: 'D1D1EB', width: 1 },
  });

  const infoSummary = `【活动主题】${activity.title}   |   【执教教师】${activity.instructor_name || '授课教师'}   |   【活动日期】${activity.activity_date}   |   【听课人员】${listenerNames}`;
  slide.addText(infoSummary, {
    x: 0.45,
    y: 0.73,
    w: 9.1,
    h: 0.33,
    fontSize: 8.5,
    color: '2D2B52',
    fontFace: 'Microsoft YaHei',
    valign: 'middle',
  });

  // 3. 核心图卡排版：
  // Column 1 (左列 x=0.35, w=2.50): 现场照片一（上）+ 现场照片二（下）垂直堆叠
  // Column 2 (中列 x=3.01, w=3.24): 全员实名签到表（大幅通高展现）
  // Column 3 (右列 x=6.41, w=3.24): 评课反馈与反思总结表（大幅通高展现）
  const cards = [
    // 左上：现场照片一（缩小）
    {
      title: '【现场照片一】课堂教学实况',
      badgeColor: '5B52A3',
      x: 0.35,
      y: 1.14,
      w: 2.50,
      badgeH: 0.24,
      imgH: 1.76,
      base64: photo1Base64,
      emptyTip: '【现场照片一】待补充上传',
    },
    // 左下：现场照片二（缩小，上下垂直排列）
    {
      title: '【现场照片二】互动研讨实况',
      badgeColor: '5B52A3',
      x: 0.35,
      y: 3.26,
      w: 2.50,
      badgeH: 0.24,
      imgH: 1.76,
      base64: photo2Base64,
      emptyTip: '【现场照片二】待补充上传',
    },
    // 中间：全员实名签到表（大幅放大，手机清晰看清名字与签名）
    {
      title: '【教研签到】全员实名签到表',
      badgeColor: '059669',
      x: 3.01,
      y: 1.14,
      w: 3.24,
      badgeH: 0.25,
      imgH: 3.87,
      base64: attendanceBase64,
      emptyTip: '【全员实名签到表】待补充上传',
    },
    // 右边：评课反馈与反思总结（大幅放大，手机清晰看清评课反思记录）
    {
      title: '【评课反思】评课反馈与反思总结',
      badgeColor: '4338CA',
      x: 6.41,
      y: 1.14,
      w: 3.24,
      badgeH: 0.25,
      imgH: 3.87,
      base64: summaryBase64,
      emptyTip: '【评课反思表】待补充上传',
    },
  ];

  for (const card of cards) {
    // 标题栏背景
    slide.addShape(pptx.ShapeType.rect, {
      x: card.x,
      y: card.y,
      w: card.w,
      h: card.badgeH,
      fill: { color: card.badgeColor },
      line: { color: card.badgeColor, width: 0 },
    });

    // 标题文本
    slide.addText(card.title, {
      x: card.x + 0.08,
      y: card.y,
      w: card.w - 0.16,
      h: card.badgeH,
      fontSize: 8.5,
      bold: true,
      color: 'FFFFFF',
      fontFace: 'Microsoft YaHei',
      valign: 'middle',
    });

    // 图片内容区白色边框容器
    const imgAreaY = card.y + card.badgeH;
    slide.addShape(pptx.ShapeType.rect, {
      x: card.x,
      y: imgAreaY,
      w: card.w,
      h: card.imgH,
      fill: { color: 'FFFFFF' },
      line: { color: 'E2E4E9', width: 1 },
    });

    if (card.base64) {
      // 充满所在区域，消除空白留白，并在手机上展现最佳阅读效果
      slide.addImage({
        data: card.base64,
        x: card.x,
        y: imgAreaY,
        w: card.w,
        h: card.imgH,
        sizing: {
          type: 'cover',
          w: card.w,
          h: card.imgH,
        },
      });
    } else {
      slide.addText(card.emptyTip, {
        x: card.x,
        y: imgAreaY,
        w: card.w,
        h: card.imgH,
        fontSize: 8.5,
        color: '9CA3AF',
        align: 'center',
        valign: 'middle',
        fontFace: 'Microsoft YaHei',
      });
    }
  }

  // 4. 底部微型档案标注
  slide.addText('颍上县耿棚中学信息技术教研组 · 数字化校本教研纪实档案', {
    x: 0.35,
    y: 5.34,
    w: 9.3,
    h: 0.22,
    fontSize: 8,
    color: '8A8A9E',
    align: 'center',
    valign: 'middle',
    fontFace: 'Microsoft YaHei',
  });

  return (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
}

/**
 * 将生成的单页 PPT 追加合并到已有 PPTX 的末尾
 */
async function appendSlideToExistingPptx(
  baseBuffer: Buffer,
  newSlideBuffer: Buffer
): Promise<Buffer> {
  const baseZip = await JSZip.loadAsync(baseBuffer);
  const newZip = await JSZip.loadAsync(newSlideBuffer);

  // 1. 查找 base 中现有的 slide 编号及最大编号
  const existingSlideFiles = Object.keys(baseZip.files).filter((f) =>
    /^ppt\/slides\/slide\d+\.xml$/.test(f)
  );
  const existingNums = existingSlideFiles.map((f) => {
    const match = f.match(/slide(\d+)\.xml/);
    return match ? parseInt(match[1], 10) : 0;
  });
  const nextSlideNum = (existingNums.length > 0 ? Math.max(...existingNums) : 0) + 1;

  const newSlidePath = `ppt/slides/slide${nextSlideNum}.xml`;
  const newSlideRelsPath = `ppt/slides/_rels/slide${nextSlideNum}.xml.rels`;

  // 2. 读取新幻灯片的 xml 与关系文件
  const newSlideFile = newZip.file('ppt/slides/slide1.xml');
  const newSlideRelsFile = newZip.file('ppt/slides/_rels/slide1.xml.rels');
  if (!newSlideFile || !newSlideRelsFile) {
    throw new Error('无法解析新生成的幻灯片结构');
  }

  const newSlideXml = await newSlideFile.async('string');
  let newSlideRelsXml = await newSlideRelsFile.async('string');

  // 3. 将新幻灯片中的 media 图片文件复制到 baseZip 中（加上专属编号前缀防止冲突）
  const newMediaFiles = Object.keys(newZip.files).filter(
    (f) => f.startsWith('ppt/media/') && !newZip.files[f].dir
  );
  for (const mediaPath of newMediaFiles) {
    const rawFilename = mediaPath.replace('ppt/media/', '');
    const uniqueFilename = `append_${nextSlideNum}_${rawFilename}`;
    const mediaBuffer = await newZip.file(mediaPath)!.async('nodebuffer');
    baseZip.file(`ppt/media/${uniqueFilename}`, mediaBuffer);

    // 替换关联文件里的 Target 路径
    const escapedRaw = rawFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    newSlideRelsXml = newSlideRelsXml.replace(
      new RegExp(`Target=["'](\\.\\.\\/)?media\\/${escapedRaw}["']`, 'g'),
      `Target="../media/${uniqueFilename}"`
    );
  }

  // 4. 清理 notesSlide 避免孤立引用，并关联 baseZip 中现有的 slideLayout
  newSlideRelsXml = newSlideRelsXml.replace(
    /<Relationship[^>]*Type=["'][^"']*notesSlide["'][^>]*\/>/g,
    ''
  );
  const baseLayouts = Object.keys(baseZip.files).filter((f) =>
    /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(f)
  );
  const defaultLayout = baseLayouts[0]
    ? baseLayouts[0].replace('ppt/', '../')
    : '../slideLayouts/slideLayout1.xml';
  newSlideRelsXml = newSlideRelsXml.replace(
    /Target=["']\.\.\/slideLayouts\/slideLayout\d+\.xml["']/g,
    `Target="${defaultLayout}"`
  );

  baseZip.file(newSlidePath, newSlideXml);
  baseZip.file(newSlideRelsPath, newSlideRelsXml);

  // 5. 更新 [Content_Types].xml
  const contentTypesFile = baseZip.file('[Content_Types].xml');
  if (contentTypesFile) {
    let contentTypes = await contentTypesFile.async('string');
    const overrideEntry = `<Override PartName="/${newSlidePath}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
    if (!contentTypes.includes(newSlidePath)) {
      contentTypes = contentTypes.replace('</Types>', `${overrideEntry}</Types>`);
      baseZip.file('[Content_Types].xml', contentTypes);
    }
  }

  // 6. 更新 ppt/_rels/presentation.xml.rels
  const presRelsFile = baseZip.file('ppt/_rels/presentation.xml.rels');
  if (!presRelsFile) {
    throw new Error('找不到 ppt/_rels/presentation.xml.rels 文件');
  }
  const presRelsStr = await presRelsFile.async('string');
  const rIdMatches = [...presRelsStr.matchAll(/Id=["']?rId(\d+)["']?/g)];
  const nextRIdNum =
    rIdMatches.reduce((max, m) => Math.max(max, parseInt(m[1], 10)), 0) + 1;
  const nextRId = `rId${nextRIdNum}`;

  const updatedPresRels = presRelsStr.replace(
    '</Relationships>',
    `<Relationship Id="${nextRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${nextSlideNum}.xml"/></Relationships>`
  );
  baseZip.file('ppt/_rels/presentation.xml.rels', updatedPresRels);

  // 7. 更新 ppt/presentation.xml 中的 sldIdLst
  const presXmlFile = baseZip.file('ppt/presentation.xml');
  if (!presXmlFile) {
    throw new Error('找不到 ppt/presentation.xml 文件');
  }
  const presXmlStr = await presXmlFile.async('string');
  const sldIdMatches = [...presXmlStr.matchAll(/id=["']?(\d+)["']?/g)];
  const nextSldId =
    sldIdMatches.reduce((max, m) => Math.max(max, parseInt(m[1], 10)), 255) + 1;

  let updatedPresXml = presXmlStr;
  if (updatedPresXml.includes('</p:sldIdLst>')) {
    updatedPresXml = updatedPresXml.replace(
      '</p:sldIdLst>',
      `<p:sldId id="${nextSldId}" r:id="${nextRId}"/></p:sldIdLst>`
    );
  } else if (updatedPresXml.includes('<p:sldIdLst/>')) {
    updatedPresXml = updatedPresXml.replace(
      '<p:sldIdLst/>',
      `<p:sldIdLst><p:sldId id="${nextSldId}" r:id="${nextRId}"/></p:sldIdLst>`
    );
  } else {
    updatedPresXml = updatedPresXml.replace(
      '</p:presentation>',
      `<p:sldIdLst><p:sldId id="${nextSldId}" r:id="${nextRId}"/></p:sldIdLst></p:presentation>`
    );
  }
  baseZip.file('ppt/presentation.xml', updatedPresXml);

  return (await baseZip.generateAsync({ type: 'nodebuffer' })) as Buffer;
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

    const buffer = await generateSingleSlidePptx(activity);
    const safeTitle = activity.title.replace(/[\\/:*?"<>|]/g, '_');
    const filename = `耿棚中学教研活动总结_${activity.activity_date}_${safeTitle}.pptx`;
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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

export async function POST(
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

    // 1. 生成当前活动的总结单页 PPT Buffer
    const newSlideBuffer = await generateSingleSlidePptx(activity);

    // 2. 检查是否有上传之前导出的 PPT 文件
    const formData = await req.formData();
    const basePptxFile = formData.get('base_pptx') as File | null;

    let finalBuffer: Buffer = newSlideBuffer;
    let isMerged = false;

    if (basePptxFile && basePptxFile.size > 0) {
      try {
        const baseArrayBuffer = await basePptxFile.arrayBuffer();
        const baseBuffer = Buffer.from(baseArrayBuffer);
        finalBuffer = await appendSlideToExistingPptx(baseBuffer, newSlideBuffer);
        isMerged = true;
      } catch (mergeErr) {
        console.error('Merge PPT error:', mergeErr);
        return NextResponse.json(
          {
            success: false,
            message: '合并原有PPT失败，请确认导入的是标准的 .pptx 文件',
          },
          { status: 400 }
        );
      }
    }

    const safeTitle = activity.title.replace(/[\\/:*?"<>|]/g, '_');
    const filename = isMerged
      ? `耿棚中学教研活动总结_累计上报_${activity.activity_date}_${safeTitle}.pptx`
      : `耿棚中学教研活动总结_${activity.activity_date}_${safeTitle}.pptx`;
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(new Uint8Array(finalBuffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: unknown) {
    console.error('Export PPT POST error:', err);
    return NextResponse.json(
      { success: false, message: '处理PPT导出或追加时发生异常，请稍后重试' },
      { status: 500 }
    );
  }
}
