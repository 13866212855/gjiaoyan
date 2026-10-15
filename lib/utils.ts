import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 统一解析文件或图片的访问 URL，兼容远程 Cloudinary (https://) 及本地相对路径
 * 特别针对手机端 HEIC 图片：自动将 Cloudinary 的 .heic 格式映射为通用 .jpg，确保所有手机和浏览器均可直接显示
 */
export function resolveFileUrl(filePath?: string | null): string {
  if (!filePath) return '';
  let trimmed = filePath.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    // 若为 Cloudinary 链接且扩展名为手机专属的 heic/heif，自动替换为 jpg 以兼容全部移动端与桌面浏览器
    if (/res\.cloudinary\.com/i.test(trimmed)) {
      trimmed = trimmed.replace(/\.(heic|heif)$/i, '.jpg');
    }
    return trimmed;
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
