import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 统一解析文件或图片的访问 URL，兼容远程 Cloudinary (https://) 及本地相对路径
 */
export function resolveFileUrl(filePath?: string | null): string {
  if (!filePath) return '';
  const trimmed = filePath.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
