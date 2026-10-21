import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 统一解析文件或图片的访问 URL，兼容远程 Cloudinary 及本地相对路径
 * 实施《myrepairpic》同域图片代理方案：
 * 手机/浏览器直连海外 CDN (res.cloudinary.com) 会在大陆网络遭遇 DNS 阻断或连接重置导致裂图；
 * 此处统一重写为应用自身的同域代理路径 `/api/img?u=...`，借由服务器畅通的出网通道转发并智能压缩，
 * 彻底确保 iPhone XS Max / 安卓 / 微信浏览器 / 电脑端均可秒级显示。
 */
export function resolveFileUrl(filePath?: string | null): string {
  if (!filePath) return '';
  let trimmed = filePath.trim();

  // 1. 若已经是同域代理地址，直接返回防重
  if (trimmed.startsWith('/api/img')) {
    return trimmed;
  }

  // 2. 若为 Cloudinary 远程存储资源
  if (/^https?:\/\/res\.cloudinary\.com\//i.test(trimmed)) {
    // 兼容 iOS 手机拍摄的 HEIC/HEIF 格式，规范为标准 JPG
    trimmed = trimmed.replace(/\.(heic|heif)$/i, '.jpg');
    // 全面走同域反向代理
    return `/api/img?u=${encodeURIComponent(trimmed)}`;
  }

  // 3. 其他外部完整链接或 base64 Data URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // 4. 本地静态资源路径
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
