'use client';

import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface LightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export default function LightboxModal({
  isOpen,
  onClose,
  imageUrl,
  title,
}: LightboxModalProps) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Actions bar */}
        <div className="w-full flex items-center justify-between text-white pb-3 px-2">
          <span className="text-sm font-medium text-gray-200">{title || '图片预览'}</span>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 text-xs"
            >
              <ExternalLink className="w-4 h-4" />
              新窗口打开
            </a>
            <a
              href={imageUrl}
              download
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 text-xs"
            >
              <Download className="w-4 h-4" />
              下载原图
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="overflow-auto max-h-[82vh] rounded-lg shadow-2xl bg-black/40 flex items-center justify-center">
          <img
            src={imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}
            alt={title || '预览'}
            className="max-h-[80vh] max-w-full object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
