import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * 同域图片/文件安全代理服务 (遵循 myrepairpic 技能规范)
 * 解决大陆移动端 (如 iPhone XS Max / 4G / 5G / 国内宽带) 浏览器直连海外 Cloudinary CDN 失败、被重置或超时裂图的问题。
 * 链路：iPhone / PC 浏览器 -> 本应用同域服务器 (/api/img) -> Cloudinary 海外 CDN
 */
export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('u');

  if (!urlParam) {
    return NextResponse.json({ error: '缺少图片地址参数 u' }, { status: 400 });
  }

  const rawUrl = decodeURIComponent(urlParam).trim();

  // 1. 白名单校验 (防 SSRF 开放代理攻击，只允许 Cloudinary 官方图床域名)
  const isCloudinary = /^https:\/\/res\.cloudinary\.com\//i.test(rawUrl);
  if (!isCloudinary) {
    return NextResponse.json({ error: '仅允许代理 Cloudinary 图床资源' }, { status: 403 });
  }

  // 2. 智能压缩与优化 (手机原图几 MB 智能转为 WebP/AVIF/JPG 适度体积，大幅加速手机端渲染并省流量)
  let targetUrl = rawUrl;
  // 检查是否为文档类（ppt/pdf/doc 等不注入图片转换参数）
  const isDoc = /\.(pptx?|pdf|docx?|zip|rar)$/i.test(rawUrl);
  if (!isDoc && targetUrl.includes('/image/upload/') && !targetUrl.includes('/f_auto') && !targetUrl.includes('/q_auto')) {
    targetUrl = targetUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
  }

  try {
    // 3. 由服务器畅通的出网通道请求 CDN 资源 (优先请求优化版，若失败回退原版)
    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GengpengTeachingProxy/1.0)',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!upstreamRes.ok && targetUrl !== rawUrl) {
        // 回退请求无 f_auto 参数的原始地址
        upstreamRes = await fetch(rawUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; GengpengTeachingProxy/1.0)',
          },
          signal: AbortSignal.timeout(15000),
        });
      }
    } catch {
      // 若优化版网络异常，尝试原地址
      upstreamRes = await fetch(rawUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GengpengTeachingProxy/1.0)',
        },
        signal: AbortSignal.timeout(15000),
      });
    }

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `图床返回错误状态: ${upstreamRes.status}` },
        { status: 502 }
      );
    }

    const contentType = upstreamRes.headers.get('content-type') || (isDoc ? 'application/octet-stream' : 'image/jpeg');
    const arrayBuffer = await upstreamRes.arrayBuffer();

    // 4. 返回同域流式响应并设置 7 天强缓存，避免重复代理请求
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400, immutable',
        'Content-Length': String(arrayBuffer.byteLength),
        'X-Proxy-By': 'Gengpeng-Image-Proxy',
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Image proxy upstream error:', errorMsg);
    return NextResponse.json(
      { error: '图片代理获取失败，请重试', details: errorMsg },
      { status: 502 }
    );
  }
}
