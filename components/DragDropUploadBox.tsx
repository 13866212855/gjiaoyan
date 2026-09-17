'use client';

import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Loader2, Sparkles, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

interface DragDropUploadBoxProps {
  onUpload: (files: File[]) => Promise<void> | void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  sublabel?: string;
  colorTheme?: 'purple' | 'emerald' | 'indigo' | 'teal' | 'blue';
  compact?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function DragDropUploadBox({
  onUpload,
  accept = 'image/*',
  multiple = false,
  label = '点击或直接拖入文件',
  sublabel = '支持从微信聊天直接拖入图片',
  colorTheme = 'purple',
  compact = false,
  className = '',
  disabled = false,
}: DragDropUploadBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme colors configuration
  const themeStyles = {
    purple: {
      border: 'border-purple-300 hover:border-[#5B52A3]',
      activeBorder: 'border-[#5B52A3] bg-purple-50/80 ring-2 ring-purple-400/40',
      iconColor: 'text-[#5B52A3]',
      badgeBg: 'bg-purple-100 text-[#5B52A3]',
      buttonBg: 'bg-[#5B52A3] hover:bg-[#4D4491] text-white',
    },
    emerald: {
      border: 'border-emerald-300 hover:border-emerald-600',
      activeBorder: 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-400/40',
      iconColor: 'text-emerald-600',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    indigo: {
      border: 'border-indigo-300 hover:border-indigo-600',
      activeBorder: 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-400/40',
      iconColor: 'text-indigo-600',
      badgeBg: 'bg-indigo-100 text-indigo-800',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    },
    teal: {
      border: 'border-teal-300 hover:border-teal-600',
      activeBorder: 'border-teal-600 bg-teal-50/80 ring-2 ring-teal-400/40',
      iconColor: 'text-teal-600',
      badgeBg: 'bg-teal-100 text-teal-800',
      buttonBg: 'bg-teal-600 hover:bg-teal-700 text-white',
    },
    blue: {
      border: 'border-blue-300 hover:border-blue-600',
      activeBorder: 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-400/40',
      iconColor: 'text-blue-600',
      badgeBg: 'bg-blue-100 text-blue-800',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  }[colorTheme];

  const processFiles = async (fileList: FileList | File[]) => {
    if (disabled || isUploading) return;
    const files: File[] = Array.from(fileList);
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      setUploadSuccess(false);
      await onUpload(multiple ? files : [files[0]]);
      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
      }, 2500);
    } catch (e) {
      console.error('Drag upload failed:', e);
      setUploadSuccess(false);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (!disabled) setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!disabled && !isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (disabled || isUploading) return;

    const extractedFiles: File[] = [];
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) {
            const validName = f.name && f.name.includes('.') ? f.name : `wechat_image_${Date.now()}_${i}.jpg`;
            extractedFiles.push(new File([f], validName, { type: f.type || 'image/jpeg' }));
          }
        }
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const f = e.dataTransfer.files[i];
        const validName = f.name && f.name.includes('.') ? f.name : `wechat_image_${Date.now()}_${i}.jpg`;
        extractedFiles.push(new File([f], validName, { type: f.type || 'image/jpeg' }));
      }
    }

    // 备选解析：针对微信或某些浏览器拖拽携带的 HTML/DataURL 图像
    if (extractedFiles.length === 0) {
      try {
        const html = e.dataTransfer.getData('text/html');
        if (html) {
          const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (match && match[1] && match[1].startsWith('data:image/')) {
            const res = await fetch(match[1]);
            const blob = await res.blob();
            extractedFiles.push(new File([blob], `wechat_image_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' }));
          }
        }
      } catch (dropErr) {
        console.warn('Could not extract image from drag payload:', dropErr);
      }
    }

    if (extractedFiles.length > 0) {
      await processFiles(extractedFiles);
    }
  };

  // 支持键盘粘贴（从微信复制图片后直接 Ctrl+V）
  const handlePaste = async (e: React.ClipboardEvent) => {
    if (disabled) return;
    if (e.clipboardData?.files?.length) {
      e.preventDefault();
      const files: File[] = [];
      for (let i = 0; i < e.clipboardData.files.length; i++) {
        const f = e.clipboardData.files[i];
        const validName = f.name && f.name.includes('.') ? f.name : `pasted_image_${Date.now()}_${i}.jpg`;
        files.push(new File([f], validName, { type: f.type || 'image/jpeg' }));
      }
      await processFiles(files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      tabIndex={0}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      onClick={handleClick}
      className={`relative cursor-pointer select-none transition-all duration-150 border-2 border-dashed rounded-xl outline-none focus:ring-2 focus:ring-purple-300 ${
        isDragging
          ? themeStyles.activeBorder
          : `${themeStyles.border} bg-white hover:bg-gray-50/80`
      } ${compact ? 'p-2' : 'p-3'} ${className} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {uploadSuccess ? (
        <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-emerald-700 font-semibold bg-emerald-50 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>上传成功！已自动保存</span>
        </div>
      ) : isUploading ? (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-600 font-medium animate-pulse">
          <Loader2 className={`w-4 h-4 animate-spin ${themeStyles.iconColor}`} />
          <span>正在快速上传云端，请稍候...</span>
        </div>
      ) : isDragging ? (
        <div className="flex flex-col items-center justify-center py-2 text-center">
          <Upload className={`w-5 h-5 animate-bounce mb-1 ${themeStyles.iconColor}`} />
          <span className="text-xs font-bold text-gray-800">松开鼠标即可立即上传</span>
          <span className="text-[10px] text-gray-500">已识别拖入文件</span>
        </div>
      ) : compact ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-700 min-w-0">
            <Upload className={`w-3.5 h-3.5 shrink-0 ${themeStyles.iconColor}`} />
            <span className="truncate font-medium">{label}</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-normal shrink-0 ${themeStyles.badgeBg}`}>
            可直接拖入
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-1.5">
          <div className="flex items-center gap-1 mb-1">
            <Upload className={`w-4 h-4 ${themeStyles.iconColor}`} />
            <span className="text-xs font-semibold text-gray-800">{label}</span>
          </div>
          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            <span>{sublabel}</span>
            <span className="text-[10px] bg-gray-100 text-gray-600 px-1 py-0.2 rounded border border-gray-200">
              或Ctrl+V粘贴
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
